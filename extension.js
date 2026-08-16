const vscode = require('vscode');
const path = require('path');
const { spawn } = require('child_process');

const charms = {
    demon: {
        name: 'Demon Head',
        image: 'demon.png'
    },

    nimbuMirchi: {
        name: 'Nimbu Mirchi',
        image: 'nimbu-mirchi.png'
    },

    lady: {
        name: 'Lady Charm',
        image: 'lady.png'
    }
};

let charmProcess = null;


/*
 * Extension activation
 */
function activate(context) {

    const sidebarProvider =
        new CharmViewProvider(context);

    context.subscriptions.push(

        vscode.window.registerWebviewViewProvider(
            'nimbuMirchiCharm.view',
            sidebarProvider
        ),


        /*
         * Choose Charm
         */
        vscode.commands.registerCommand(
            'nimbuMirchiCharm.chooseCharm',
            async () => {

                const choice =
                    await vscode.window.showQuickPick(

                        Object.entries(charms).map(
                            ([id, charm]) => ({
                                label: charm.name,
                                description: 'Select this charm',
                                id
                            })
                        ),

                        {
                            placeHolder: 'Choose ONE charm'
                        }
                    );

                if (!choice) {
                    return;
                }

                await saveSelectedCharm(choice.id);

                sidebarProvider.refresh();

                showCharmWindow(context);
            }
        ),


        /*
         * Hang Charm
         */
        vscode.commands.registerCommand(
            'nimbuMirchiCharm.showCharm',
            () => {

                showCharmWindow(context);

            }
        ),


        /*
         * Hide Charm
         */
        vscode.commands.registerCommand(
            'nimbuMirchiCharm.hideCharm',
            () => {

                stopCharmWindow();

            }
        )
    );
}


/*
 * Save selected charm
 */
async function saveSelectedCharm(charm) {

    await vscode.workspace
        .getConfiguration('nimbuMirchiCharm')
        .update(
            'selectedCharm',
            charm,
            vscode.ConfigurationTarget.Global
        );
}


/*
 * Show selected charm
 */
function showCharmWindow(context) {

    /*
     * If a charm is already running,
     * replace it with the selected charm.
     */
    if (charmProcess) {

        stopCharmWindow();

        setTimeout(() => {
            startCharmWindow(context);
        }, 300);

        return;
    }

    startCharmWindow(context);
}


/*
 * Start floating charm
 */
function startCharmWindow(context) {

    if (charmProcess) {
        return;
    }


    const selected =
        vscode.workspace
            .getConfiguration('nimbuMirchiCharm')
            .get(
                'selectedCharm',
                'nimbuMirchi'
            );


    const charm =
        charms[selected] ||
        charms.nimbuMirchi;


    /*
     * Full path to the selected PNG.
     */
    const imagePath =
        context.asAbsolutePath(
            path.join(
                'media',
                charm.image
            )
        );


    /*
     * Full path to PowerShell script.
     */
    const scriptPath =
        context.asAbsolutePath(
            path.join(
                'media',
                'charm-window.ps1'
            )
        );


    console.log(
        'Drishti Gombe: Starting charm'
    );

    console.log(
        'Selected:',
        charm.name
    );

    console.log(
        'Image:',
        imagePath
    );

    console.log(
        'PowerShell:',
        scriptPath
    );


    charmProcess =
        spawn(
            'powershell.exe',
            [
                '-NoProfile',
                '-ExecutionPolicy',
                'Bypass',
                '-File',
                scriptPath,
                '-ImagePath',
                imagePath,
                '-Name',
                charm.name
            ],
            {
                windowsHide: true
            }
        );


    /*
     * PowerShell output
     */
    charmProcess.stdout.on(
        'data',
        data => {

            console.log(
                'Drishti Gombe:',
                data.toString()
            );

        }
    );


    /*
     * PowerShell errors
     */
    charmProcess.stderr.on(
        'data',
        data => {

            console.error(
                'Drishti Gombe PowerShell:',
                data.toString()
            );

        }
    );


    /*
     * Process error
     */
    charmProcess.on(
        'error',
        error => {

            console.error(
                'Drishti Gombe process error:',
                error
            );

            charmProcess = null;

        }
    );


    /*
     * Process exit
     */
    charmProcess.on(
        'exit',
        (code, signal) => {

            console.log(
                `Drishti Gombe exited. Code: ${code}, Signal: ${signal}`
            );

            charmProcess = null;

        }
    );
}


/*
 * Stop floating charm
 */
function stopCharmWindow() {

    if (!charmProcess) {
        return;
    }


    console.log(
        'Drishti Gombe: Hiding charm'
    );


    try {

        charmProcess.kill();

    }
    catch (error) {

        console.error(
            'Drishti Gombe: Failed to stop charm',
            error
        );

    }


    charmProcess = null;
}


/*
 * Sidebar provider
 */
class CharmViewProvider {

    constructor(context) {

        this.context = context;
        this.view = undefined;

    }


    resolveWebviewView(view) {

        this.view = view;


        view.webview.options = {
            enableScripts: true
        };


        view.webview.onDidReceiveMessage(

            async message => {

                /*
                 * Hang button
                 */
                if (message.action === 'hang') {

                    showCharmWindow(
                        this.context
                    );

                    return;
                }


                /*
                 * Hide button
                 */
                if (message.action === 'hide') {

                    stopCharmWindow();

                    return;
                }


                /*
                 * Charm selection
                 */
                if (charms[message.charm]) {

                    await saveSelectedCharm(
                        message.charm
                    );

                    this.refresh();

                    showCharmWindow(
                        this.context
                    );

                }

            }
        );


        this.refresh();
    }


    refresh() {

        if (!this.view) {
            return;
        }


        const selected =
            vscode.workspace
                .getConfiguration('nimbuMirchiCharm')
                .get(
                    'selectedCharm',
                    'nimbuMirchi'
                );


        this.view.webview.html =
            sidebarHtml(selected);
    }
}


/*
 * Sidebar UI
 */
function sidebarHtml(selected) {

    const current =
        charms[selected] ||
        charms.nimbuMirchi;


    const buttons =
        Object.entries(charms)
            .map(
                ([id, charm]) => `

        <button
            class="choice ${id === selected ? 'selected' : ''}"
            data-id="${id}"
        >

            <span class="charmIcon">
                ${getIcon(id)}
            </span>

            <span>

                <b>
                    ${charm.name}
                </b>

                <small>
                    ${
                        id === selected
                            ? 'Currently selected'
                            : 'Select this charm'
                    }
                </small>

            </span>

        </button>

        `
            )
            .join('');


    return `

<!doctype html>

<html>

<head>

<meta charset="UTF-8">

<style>

body {

    font-family:
        var(--vscode-font-family);

    color:
        var(--vscode-foreground);

    padding:
        12px;
}


.current {

    text-align:
        center;

    padding:
        14px;

    border:
        1px solid
        var(--vscode-focusBorder);

    border-radius:
        10px;

    background:
        var(--vscode-editor-background);
}


.big {

    font-size:
        48px;
}


.current b {

    display:
        block;

    margin-top:
        5px;
}


.current small {

    display:
        block;

    margin-top:
        4px;

    opacity:
        .75;
}


.choice {

    width:
        100%;

    display:
        flex;

    gap:
        10px;

    align-items:
        center;

    text-align:
        left;

    margin:
        8px 0;

    padding:
        10px;

    border-radius:
        8px;

    border:
        1px solid
        var(--vscode-button-secondaryBackground);

    background:
        var(--vscode-button-secondaryBackground);

    color:
        var(--vscode-button-secondaryForeground);

    cursor:
        pointer;
}


.choice:hover {

    background:
        var(--vscode-button-secondaryHoverBackground);
}


.choice.selected {

    outline:
        1px solid
        var(--vscode-focusBorder);
}


.charmIcon {

    font-size:
        28px;
}


small {

    display:
        block;

    opacity:
        .75;

    margin-top:
        3px;
}


.action {

    width:
        100%;

    margin:
        8px 0;

    padding:
        10px;

    border:
        1px solid
        var(--vscode-button-background);

    border-radius:
        8px;

    background:
        var(--vscode-button-background);

    color:
        var(--vscode-button-foreground);

    cursor:
        pointer;

    font-size:
        13px;
}


.action:hover {

    background:
        var(--vscode-button-hoverBackground);
}

</style>

</head>


<body>


<h2>
    🧿 Drishti Gombe
</h2>


<div class="current">

    <div class="big">
        ${getIcon(selected)}
    </div>

    <b>
        ${current.name}
    </b>

    <small>
        Currently selected
    </small>

</div>


<h3>
    Choose ONE charm
</h3>


${buttons}


<button
    class="action"
    id="hangCharm"
>
    Hang Charm
</button>


<button
    class="action"
    id="hideCharm"
>
    Hide Charm
</button>


<script>

const vscode =
    acquireVsCodeApi();


/*
 * Charm selection
 */
document
    .querySelectorAll('.choice')
    .forEach(button => {

        button.onclick = () => {

            vscode.postMessage({

                charm:
                    button.dataset.id

            });

        };

    });


/*
 * Hang Charm
 */
document
    .getElementById('hangCharm')
    .onclick = () => {

        vscode.postMessage({

            action:
                'hang'

        });

    };


/*
 * Hide Charm
 */
document
    .getElementById('hideCharm')
    .onclick = () => {

        vscode.postMessage({

            action:
                'hide'

        });

    };

</script>


</body>

</html>

`;
}


/*
 * Small sidebar icons.
 *
 * These remain emoji for now.
 * The floating window uses the real PNG files.
 */
function getIcon(id) {

    if (id === 'demon') {
        return '👹';
    }

    if (id === 'nimbuMirchi') {
        return '🍋🌶️';
    }

    return '👁️';
}


/*
 * Extension shutdown
 */
function deactivate() {

    stopCharmWindow();

}


module.exports = {
    activate,
    deactivate
};