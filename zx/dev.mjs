#!/usr/bin/env zx

// ------------------------
// | Require programs     |
// ------------------------


await which('fzf').catch(() => {
    console.error(chalk.red`fzf not found. Please install fzf.`);
    process.exit(1);
});

await which('code').catch(() => {
    console.error(chalk.red`VS Code not found. Please install VS Code.`);
    process.exit(1);
});

// ------------------------
// | Helper Vars/Funcs    |
// ------------------------

const DEV_FOLDER = process.env.DEV_FOLDER || path.join(os.homedir(), "dev/");

await fs.ensureDir(DEV_FOLDER);

const projects = {};
const projectNames = [];

const colors = [
    "#0ea5e9",
    "#6366f1",
    "#ec4899",
    "#f97316",
    "#a855f7",
    "#84cc16",
    "#22c55e",
    "#ef4444",
    "#eab308",
    "#14b8a6",
];

const groupColorTable = {};

const stripAnsi = (str) => {
    return str.replace(
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ""
    );
};

// ------------------------
// | Folder Projects      |
// ------------------------

const projects_raw = (
    await quiet($`find ${DEV_FOLDER} -maxdepth 2 -type d`)
).stdout
    .split("\n")
    .filter((p) =>
        p
            .replace(DEV_FOLDER, "")
            .replace(/^\//, "")
            .match(/.*\/.*/)
    );

for (const project_raw of projects_raw) {
    let project = project_raw.replace(DEV_FOLDER, "").replace(/^\//, "");
    const project_group = project.split("/")[0];
    const project_name = project.split("/")[1];

    if (!groupColorTable[project_group])
        groupColorTable[project_group] = colors.shift();

    if (groupColorTable[project_group])
        project = `${chalk.bold.hex(groupColorTable[project_group])(
            project_group
        )}/${chalk.reset(project_name)}`;

    projects[stripAnsi(project)] = {
        type: "folder",
        path: project_raw,
    };
    projectNames.push(project);
}

// ------------------------
// | Workspaces           |
// ------------------------

const workspacesRaw = (
    await quiet(
        $`find ${DEV_FOLDER} -maxdepth 3 -type f -name "*.code-workspace"`
    )
).stdout
    .split("\n")
    .filter(Boolean);

for (const workspaceRaw of workspacesRaw) {
    let workspace =
        workspaceRaw.replace(DEV_FOLDER, "").replace(".code-workspace", "") +
        chalk.bold.gray` (WORKSPACE)`;
    const workspaceSplit = workspace.split("/");

    let workspaceGroup;
    let workspaceName;

    if (workspaceSplit.length === 1) {
        workspaceGroup = "workspaces";
        workspaceName = workspaceSplit[0];
    } else {
        workspaceGroup = workspaceSplit[0];
        workspaceName = workspaceSplit.splice(1).join("/");
    }

    if (!groupColorTable[workspaceGroup])
        groupColorTable[workspaceGroup] = colors.shift();

    if (groupColorTable[workspaceGroup])
        workspace = `${chalk.bold.hex(groupColorTable[workspaceGroup])(
            workspaceGroup
        )}/${chalk.reset(workspaceName)}`;

    projects[stripAnsi(workspace)] = {
        type: "workspace",
        path: workspaceRaw,
    };
    projectNames.push(workspace);
}

// ------------------------
// | Choose Project       |
// ------------------------

let chosenProject;

projectNames.sort();

try {
    chosenProject = (
        await quiet($`echo ${projectNames.join("\n")}`).pipe(
            $`fzf --reverse --ansi`
        )
    ).stdout.trim();
} catch (error) {
    console.log(chalk.red("No project chosen"));
    process.exit(1);
}

// ------------------------
// | Open Project         |
// ------------------------

const projectData = projects[chosenProject];

if (!projectData) {
    console.log(chalk.red("No project found"));
    process.exit(1);
}

switch (projectData.type) {
    case "folder":
        if (await fs.pathExists(path.join(projectData.path, ".idea"))) {
            console.log(chalk.bold.greenBright("Opening IDEA project..."));
            await quiet($`idea ${projectData.path} > /dev/null 2>&1 &`);
        } else {
            console.log(chalk.bold.greenBright("Opening project..."));
            await quiet($`code ${projectData.path}`);
        }

        try {
            await quiet($`pgrep -x "gitkraken"`); // Will error if gitkraken is not running
            console.log(chalk.bold.greenBright("GitKraken is running"));
        } catch (error) {
            console.log(chalk.bold.yellowBright("Starting GitKraken"));
            await quiet($`gitkraken ${projectData.path} > /dev/null 2>&1 &`);
        }

        break;

    case "workspace":
        console.log(chalk.bold.greenBright("Opening workspace..."));
        await quiet($`code ${projectData.path}`);
        break;

    default:
        console.log(chalk.red("Invalid Project Type"));
        break;
}

if (process.env.DEBUG)
    console.log({
        DEV_FOLDER,
        projects_raw,
        projects,
        workspaces_raw: workspacesRaw,
        chosenProject: {
            key: chosenProject,
            value: projectData,
        },
    });
