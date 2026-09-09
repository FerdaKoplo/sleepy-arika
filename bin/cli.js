#!/usr/bin/env node

const { program } = require("commander");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

program
  .name("create-arika")
  .description(
    "Wake up a high-performance write-behind cache backend boilerplate",
  )
  .argument("<project-directory>", "Directory to wake Arika up in")
  .action((projectDirectory) => {
    const targetPath = path.join(process.cwd(), projectDirectory);
    const templatePath = path.join(__dirname, "../template");

    console.log(
      chalk.cyan(
        `\n*yawns* You want me to build a backend in /${projectDirectory}...?`,
      ),
    );
    console.log(
      chalk.gray(`Waking up Arika and copying boilerplate files...\n`),
    );

    try {
      fs.copySync(templatePath, targetPath);

      const gitignorePath = path.join(targetPath, "gitignore");
      const properGitignorePath = path.join(targetPath, ".gitignore");
      if (fs.existsSync(gitignorePath)) {
        fs.renameSync(gitignorePath, properGitignorePath);
      }

      console.log(
        chalk.green(
          `Success! Arika is awake and ready in /${projectDirectory}`,
        ),
      );
      console.log(chalk.white(`\nHere is how to get started:`));
      console.log(chalk.cyan(`  cd ${projectDirectory}`));
      console.log(chalk.cyan(`  npm install`));
      console.log(chalk.cyan(`  docker compose up -d`));
      console.log(chalk.cyan(`  npx prisma db push`));
      console.log(chalk.cyan(`  npm run dev`));

      console.log(chalk.gray(`\nGood luck! Don't let her fall back asleep.\n`));
    } catch (err) {
      console.error(
        chalk.red(`\n[Error] Arika tripped and dropped the files:`),
        err,
      );
    }
  });

program.parse(process.argv);
