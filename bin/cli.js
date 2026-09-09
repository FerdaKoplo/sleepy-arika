#!/usr/bin/env node

const { program } = require("commander");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const prompts = require("prompts");

program
  .name("create-arika")
  .description(
    "Wake up a high-performance write-behind cache backend boilerplate",
  )
  .argument("<project-directory>", "Directory to wake Arika up in")
  .action(async (projectDirectory) => {
    console.log(chalk.cyan(`\n*yawns* Let me grab my notebook...`));

    const response = await prompts({
      type: "select",
      name: "database",
      message: "Which database should Arika use to store her memories?",
      choices: [
        {
          title: "MySQL",
          description: "The classic relational notebook",
          value: "mysql",
        },
        {
          title: "PostgreSQL",
          description: "The heavy-duty structured notebook",
          value: "postgres",
        },
        {
          title: "MongoDB",
          description: "The flexible NoSQL notebook",
          value: "mongo",
        },
      ],
      initial: 0,
    });

    if (!response.database) {
      console.log(chalk.red(`Nevermind then, going back to sleep...`));
      process.exit(1);
    }

    const targetPath = path.join(process.cwd(), projectDirectory);
    const templatePath = path.join(__dirname, "../template");

    console.log(
      chalk.gray(
        `\n[System] Waking up Arika and setting up ${response.database}...`,
      ),
    );

    try {
      fs.copySync(templatePath, targetPath);

      const dbOptionsPath = path.join(
        targetPath,
        "_db-options",
        response.database,
      );

      const basePackagePath = path.join(targetPath, "package.json");
      const dockerFile = path.join(dbOptionsPath, "docker-compose.yml");
      const schemaFile = path.join(dbOptionsPath, "schema.prisma");
      const adapterFile = path.join(dbOptionsPath, "adapter.ts");

      if (fs.existsSync(dockerFile)) {
        fs.copySync(dockerFile, path.join(targetPath, "docker-compose.yml"));
      }
      if (fs.existsSync(schemaFile)) {
        fs.copySync(schemaFile, path.join(targetPath, "schema.prisma"));
      }
      if (fs.existsSync(adapterFile)) {
        fs.copySync(adapterFile, path.join(targetPath, "adapter.ts"));
      }

      const depsFragmentPath = path.join(dbOptionsPath, "deps.json");

      if (fs.existsSync(depsFragmentPath)) {
        const basePackage = fs.readJsonSync(basePackagePath);
        const dbDeps = fs.readJsonSync(depsFragmentPath);

        basePackage.dependencies = {
          ...basePackage.dependencies,
          ...dbDeps.dependencies,
        };

        fs.writeJsonSync(basePackagePath, basePackage, { spaces: 2 });
      }

      fs.removeSync(path.join(targetPath, "_db-options"));

      const gitignorePath = path.join(targetPath, "gitignore");
      const properGitignorePath = path.join(targetPath, ".gitignore");
      if (fs.existsSync(gitignorePath))
        fs.renameSync(gitignorePath, properGitignorePath);

      console.log(
        chalk.green(
          `Arika is awake with her ${response.database} notebook in /${projectDirectory}`,
        ),
      );
      console.log(chalk.white(`\nHere is how to get started:`));
      console.log(chalk.cyan(`  cd ${projectDirectory}`));
      console.log(chalk.cyan(`  npm install`));
      console.log(chalk.cyan(`  docker compose up -d`));
      console.log(chalk.cyan(`  npx prisma db push`));
      console.log(chalk.cyan(`  npm run dev\n`));
    } catch (err) {
      console.error(chalk.red(`\nArika tripped and dropped the files:`), err);
    }
  });

program.parse(process.argv);
