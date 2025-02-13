import 'zx/globals';
import 'path';
import 'process';
import 'fs-extra';
import * as dotenv from 'dotenv';
dotenv.config();

$.verbose = true; //prints all executed commands alongside with their outputs

const dirPath = process.env.PATH_REPOS ?? '';

function getDirectories(sourcePath) {
    return fs.readdirSync(sourcePath)
      .filter(item => fs.statSync(path.join(sourcePath, item)).isDirectory());
  }
  
  try {
    const directories = getDirectories(dirPath);
    console.log(directories);
  } catch (error) {
    console.error("Ошибка:", error.message);
  }