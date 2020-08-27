import * as vscode from 'vscode';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as process from 'process';

let teeTerm: vscode.Terminal | undefined;
const fsLog = "/tmp/deactivate-test/fs_log";

async function log(name: string) {
	const time = process.hrtime();
	const stamp = `${time[0]}.${time[1]} ${name}`;
	fs.appendFileSync(fsLog, `${stamp} A \n`);
	try {
		teeTerm!.sendText(`${time[0]}.${time[1]} ${name}\n`);
	} catch (e) {
		fs.appendFileSync(fsLog, `${stamp} B \n`);
	}
	fs.appendFileSync(fsLog, `${stamp} C\n`);
	try {
		await vscode.workspace.getConfiguration("deactivate-test")
			.update(
				`deactivate-test-${name}`,
				`${time[0]}.${time[1]}`,
				vscode.ConfigurationTarget.Global
			);
	} catch (e) {
		fs.appendFileSync(fsLog, `${stamp} D\n`);
	}
	fs.appendFileSync(fsLog, `${stamp} E\n`);
}

async function init() {
	cp.execFileSync("/usr/bin/rm", ["-rf", "/tmp/deactivate-test"]);
	fs.mkdirSync("/tmp/deactivate-test");
	fs.appendFileSync(fsLog, 'init\n');
	for (const k of ["activate", "deactivateInstant", "deactivateEarly", "deactivateLate"]) {
		await vscode.workspace.getConfiguration("deactivate-test")
			.update(`deactivate-test-${k}`, null, vscode.ConfigurationTarget.Global);
	}
	teeTerm = vscode.window.createTerminal({
		name: "deactivate-test",
		shellPath: "/usr/bin/tee",
		shellArgs: ["/tmp/deactivate-test/tee_log"],
		hideFromUser: false,
	});
}

export async function activate(context: vscode.ExtensionContext) {
	await init();

	await log("activate");

	context.subscriptions.push(vscode.commands.registerCommand(
		'deactivate-test.helloWorld', () => { }
	));

	context.subscriptions.push(new vscode.Disposable(async () => {
		await log("dispose");
	}));
}

export async function deactivate(): Promise<void> {
	await Promise.all([
		await log("deactivateInstant"),
		await (async () => {
			await new Promise(r => setTimeout(r, 50));
			await log("deactivateEarly");
		})(),
		await (async () => {
			await new Promise(r => setTimeout(r, 7000));
			await log("deactivateLate");
		})(),
	]).catch(e => {
		fs.appendFileSync(fsLog, `catch deactivate`);
	});
}
