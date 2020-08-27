import * as vscode from 'vscode';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as process from 'process';

let teeTerm: vscode.Terminal | undefined;

async function log(name: string) {
	const time = process.hrtime();
	fs.mkdirSync(`/tmp/deactivate-test/${time[0]}.${time[1]} ${name}`);
	await vscode.workspace.getConfiguration("deactivate-test")
		.update(`deactivate-test-${name}`, `${time[0]}.${time[1]}`);
	teeTerm!.sendText(`${time[0]}.${time[1]} ${name}\n`);
}

async function init() {
	cp.execFileSync("/usr/bin/rm", ["-rf", "/tmp/deactivate-test"]);
	fs.mkdirSync("/tmp/deactivate-test");
	for (const k of ["activate", "deactivate", "deactivateEarly", "deactivateLate"]) {
		await vscode.workspace.getConfiguration("deactivate-test")
			.update(`deactivate-test-${k}`, null);
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
	await log("deactivate");
	await new Promise(r => setTimeout(r, 500));
	await log("deactivateEarly");
	await new Promise(r => setTimeout(r, 5000));
	await log("deactivateLate");
}
