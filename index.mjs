#!/usr/bin/env zx

import 'zx/globals';
import 'path';
import 'process';
import 'fs-extra';
import * as dotenv from 'dotenv';
dotenv.config();

$.verbose = true; //prints all executed commands alongside with their outputs

const dirPath = process.env.PATH_REPOS ?? '';
const DIR_FILE = "dir.json"; // Файл с информацией о главных ветках

await $`echo $PWD`;

// Читаем dir.json и получаем объект { "repo-name": "main-branch" }
async function getMainBranches() {
    try {
        const content = await fs.readFile(DIR_FILE, "utf-8");
        return JSON.parse(content);
    } catch (error) {
        console.error("❌ Ошибка при чтении dir.json:", error.message);
        return {};
    }
}

// Получаем список всех git-репозиториев в dirPath, но оставляем только те, что есть в dir.json
async function getGitRepos(mainBranches) {
    const repoNames = Object.keys(mainBranches); // Только те репозитории, что в dir.json
    const validRepos = [];

    for (const repoName of repoNames) {
        const repoPath = path.join(dirPath, repoName);
        try {
            await fs.access(path.join(repoPath, ".git")); // Проверяем, что это git-репозиторий
            validRepos.push(repoPath);
        } catch {
            console.warn(`⚠ Репозиторий ${repoName} отсутствует в ${dirPath} или не является git-репозиторием.`);
        }
    }

    return validRepos;
}

// Удаляем все локальные ветки, кроме указанной
async function deleteLocalBranches(repoPath, mainBranch) {
    try {
        await fs.access(path.join(repoPath, ".git")); // Проверяем наличие .git
        cd(repoPath);
        console.log(`🔄 Обрабатываю репозиторий: ${repoPath}`);

        // Переключаемся на главную ветку перед удалением
        console.log(`🔀 Переключаюсь на основную ветку: ${mainBranch}`);
        await $`git checkout ${mainBranch} || true`; // Игнорируем ошибку, если уже на ней
        
        // Подтягиваем последние изменения
        console.log(`🔄 Выполняю git pull для ${mainBranch}`);
        await $`git pull --rebase || true`; // --rebase помогает избежать merge-коммитов

        // Получаем список всех локальных веток, кроме главной
        let branches = await $`git branch | grep -v '${mainBranch}' || true`;
        branches = branches.stdout.trim().split("\n").map(b => b.trim()).filter(b => b !== "");

        if (branches.length === 0) {
            console.log("✅ Нет локальных веток для удаления.");
            return;
        }

        // Удаляем каждую найденную ветку
        for (const branch of branches) {
            console.log(`🗑 Удаляю ветку: ${branch}`);
            await $`git branch -D ${branch} || true`;
        }
    } catch (error) {
        console.error(`❌ Ошибка в ${repoPath}:`, error.message);
    }
}

// Основная функция
async function processRepos() {
    const mainBranches = await getMainBranches();
    // console.log("📚 Главные ветки:", mainBranches);
    const repos = await getGitRepos(mainBranches); // Берем только нужные репозитории
    // console.log("📁 Найденные репозитории:", repos);
    for (const repo of repos) {
        const repoName = path.basename(repo);
        const mainBranch = mainBranches[repoName]; // Главная ветка из dir.json
        await deleteLocalBranches(repo, mainBranch);
        console.log("🔄 Следующий репозиторий...");
    }

    console.log(`🎉 Все ненужные локальные ветки удалены!`);
}

await processRepos();