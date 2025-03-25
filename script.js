class LCAPlayGround {
    constructor() {
        this.initializeElements();
        this.initializeEditors();
        this.setupEventListeners();
        this.loadSettings();
    }

    initializeElements() {
        this.elements = {
            htmlEditor: document.getElementById('html-editor'),
            cssEditor: document.getElementById('css-editor'),
            jsEditor: document.getElementById('js-editor'),
            livePreview: document.getElementById('live-preview'),
            consoleLog: document.getElementById('console-log'),
            runButton: document.getElementById('run-code'),
            saveButton: document.getElementById('save-project'),
            downloadButton: document.getElementById('download-project'),
            newButton: document.getElementById('new-project'),
            settingsModal: document.getElementById('settings-modal'),
            projectsModal: document.getElementById('projects-modal'),
            themeSelect: document.getElementById('theme-select'),
            fontSizeInput: document.getElementById('font-size'),
            autoRunToggle: document.getElementById('auto-run'),
            fullscreenToggle: document.getElementById('fullscreen-toggle'),
            saveSettings: document.getElementById('save-settings'),
            resizer: document.getElementById('resizer'),
            editorSection: document.querySelector('.editor-section'),
            outputSection: document.querySelector('.output-section')
        };
    }

    initializeEditors() {
        this.editors = {
            html: CodeMirror.fromTextArea(this.elements.htmlEditor, {
                mode: 'htmlmixed',
                theme: 'monokai',
                lineNumbers: true,
                extraKeys: { "Ctrl-Space": "autocomplete" }
            }),
            css: CodeMirror.fromTextArea(this.elements.cssEditor, {
                mode: 'css',
                theme: 'monokai',
                lineNumbers: true,
                extraKeys: { "Ctrl-Space": "autocomplete" }
            }),
            js: CodeMirror.fromTextArea(this.elements.jsEditor, {
                mode: 'javascript',
                theme: 'monokai',
                lineNumbers: true,
                extraKeys: { "Ctrl-Space": "autocomplete" }
            })
        };
    }

    setupEventListeners() {
        const { 
            runButton, saveButton, downloadButton, newButton, 
            themeSelect, fontSizeInput, autoRunToggle, 
            fullscreenToggle, saveSettings, resizer
        } = this.elements;

        runButton.addEventListener('click', () => this.runCode());
        saveButton.addEventListener('click', () => this.saveProject());
        downloadButton.addEventListener('click', () => this.downloadProject());
        newButton.addEventListener('click', () => this.createNewProject());
        fullscreenToggle.addEventListener('click', () => this.toggleFullscreen());
        saveSettings.addEventListener('click', () => this.saveSettings());

        themeSelect.addEventListener('change', (e) => this.changeTheme(e.target.value));
        fontSizeInput.addEventListener('input', (e) => this.changeFontSize(e.target.value));
        autoRunToggle.addEventListener('change', (e) => this.toggleAutoRun(e.target.checked));

        resizer.addEventListener('mousedown', (e) => this.initResize(e));

        Object.values(this.editors).forEach(editor => {
            editor.on('change', () => this.handleEditorInput());
        });

        this.setupTabNavigation();
        this.setupModalControls();
    }

    setupTabNavigation() {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.target;
                this.switchOutputTab(target);
            });
        });
    }

    setupModalControls() {
        const modals = {
            settings: {
                open: document.getElementById('settings-btn'),
                close: document.getElementById('close-settings'),
                modal: this.elements.settingsModal
            },
            projects: {
                open: document.getElementById('projects-btn'),
                close: document.getElementById('close-projects'),
                modal: this.elements.projectsModal
            }
        };

        Object.values(modals).forEach(({ open, close, modal }) => {
            if (open && close) {
                open.addEventListener('click', () => modal.style.display = 'flex');
                close.addEventListener('click', () => modal.style.display = 'none');
            }
        });
    }

    initResize(e) {
        e.preventDefault(); // Prevent text selection
        const { editorSection, outputSection, resizer } = this.elements;
        resizer.classList.add('active');
        const startX = e.clientX;
        const editorStartWidth = editorSection.getBoundingClientRect().width;
        const totalWidth = document.querySelector('.workspace').getBoundingClientRect().width;
        const minWidth = 200;

        const resize = (e) => {
            requestAnimationFrame(() => {
                const delta = e.clientX - startX;
                const newEditorWidth = Math.max(minWidth, Math.min(editorStartWidth + delta, totalWidth - minWidth - resizer.offsetWidth));
                editorSection.style.width = `${newEditorWidth}px`;
                outputSection.style.flex = '1'; // Allow output to adjust naturally
                Object.values(this.editors).forEach(editor => editor.refresh()); // Refresh editors to prevent layout issues
            });
        };

        const stopResize = () => {
            resizer.classList.remove('active');
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        };

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    }

    switchOutputTab(tabName) {
        const tabs = document.querySelectorAll('.tab-btn');
        const preview = this.elements.livePreview;
        const consoleOutput = this.elements.consoleLog;

        tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.target === tabName));
        preview.style.display = tabName === 'preview' ? 'block' : 'none';
        consoleOutput.style.display = tabName === 'console' ? 'block' : 'none';
    }

    runCode() {
        const { livePreview, consoleLog } = this.elements;
        const html = this.editors.html.getValue();
        const css = this.editors.css.getValue();
        const js = this.editors.js.getValue();
        
        consoleLog.innerHTML = '';
        const iframe = livePreview.contentWindow || livePreview.contentDocument.document || livePreview.contentDocument;
        const doc = iframe.document;

        const consoleOutput = [];
        const customConsole = {
            log: (...args) => {
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
                consoleOutput.push(`<div class="log-entry">${message}</div>`);
                consoleLog.innerHTML = consoleOutput.join('');
            },
            error: (...args) => {
                const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
                consoleOutput.push(`<div class="log-entry error">${message}</div>`);
                consoleLog.innerHTML = consoleOutput.join('');
            }
        };

        const iframeContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>
                    (function() {
                        const originalConsole = window.console;
                        window.console = {
                            log: (...args) => { window.parent.postMessage({ type: 'log', data: args }, '*'); },
                            error: (...args) => { window.parent.postMessage({ type: 'error', data: args }, '*'); }
                        };
                        try {
                            ${js}
                        } catch (error) {
                            window.console.error('Execution Error:', error.message);
                        }
                    })();
                </script>
            </body>
            </html>
        `;

        window.addEventListener('message', (event) => {
            if (event.data.type === 'log') {
                customConsole.log(...event.data.data);
            } else if (event.data.type === 'error') {
                customConsole.error(...event.data.data);
            }
        });

        doc.open();
        doc.write(iframeContent);
        doc.close();
    }

    saveProject() {
        const projectData = {
            html: this.editors.html.getValue(),
            css: this.editors.css.getValue(),
            js: this.editors.js.getValue(),
            timestamp: new Date().toISOString()
        };

        const projects = JSON.parse(localStorage.getItem('lca_projects') || '[]');
        projects.push(projectData);
        localStorage.setItem('lca_projects', JSON.stringify(projects));

        this.updateProjectsList();
        alert('Project saved successfully!');
    }

    downloadProject() {
        const zip = new JSZip();
        zip.file('index.html', this.editors.html.getValue());
        zip.file('styles.css', this.editors.css.getValue());
        zip.file('script.js', this.editors.js.getValue());

        zip.generateAsync({ type: 'blob' }).then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'lca-playground-project.zip';
            link.click();
            URL.revokeObjectURL(link.href);
        });
    }

    updateProjectsList() {
        const projectList = document.getElementById('project-list');
        const projects = JSON.parse(localStorage.getItem('lca_projects') || '[]');

        projectList.innerHTML = projects.map((project, index) => `
            <li data-index="${index}">
                <span>Project ${index + 1}</span>
                <small>${new Date(project.timestamp).toLocaleString()}</small>
            </li>
        `).join('');

        projectList.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => this.loadProject(li.dataset.index));
        });
    }

    loadProject(index) {
        const projects = JSON.parse(localStorage.getItem('lca_projects') || '[]');
        const project = projects[index];

        if (project) {
            this.editors.html.setValue(project.html);
            this.editors.css.setValue(project.css);
            this.editors.js.setValue(project.js);
            this.runCode();
            this.elements.projectsModal.style.display = 'none';
        }
    }

    createNewProject() {
        this.editors.html.setValue('');
        this.editors.css.setValue('');
        this.editors.js.setValue('');
        this.elements.consoleLog.innerHTML = '';
        this.elements.livePreview.srcdoc = '';
    }

    toggleFullscreen() {
        const { outputSection, fullscreenToggle } = this.elements;
        outputSection.classList.toggle('fullscreen');
        fullscreenToggle.textContent = outputSection.classList.contains('fullscreen') ? 'Exit Fullscreen' : 'Fullscreen';
    }

    changeTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        const editorTheme = theme === 'light' ? 'default' : 'monokai';
        Object.values(this.editors).forEach(editor => {
            editor.setOption('theme', editorTheme);
            editor.refresh();
        });
        localStorage.setItem('lca_theme', theme);
    }

    changeFontSize(size) {
        Object.values(this.editors).forEach(editor => {
            editor.getWrapperElement().style.fontSize = `${size}px`;
            editor.refresh();
        });
        localStorage.setItem('lca_font_size', size);
    }

    toggleAutoRun(enabled) {
        localStorage.setItem('lca_auto_run', enabled);
    }

    handleEditorInput() {
        const autoRunEnabled = localStorage.getItem('lca_auto_run') === 'true';
        if (autoRunEnabled) {
            this.runCode();
        }
    }

    saveSettings() {
        this.changeTheme(this.elements.themeSelect.value);
        this.changeFontSize(this.elements.fontSizeInput.value);
        this.toggleAutoRun(this.elements.autoRunToggle.checked);
        this.elements.settingsModal.style.display = 'none';
    }

    loadSettings() {
        const theme = localStorage.getItem('lca_theme') || 'dark';
        const fontSize = localStorage.getItem('lca_font_size') || '16';
        const autoRun = localStorage.getItem('lca_auto_run') !== 'false';

        this.elements.themeSelect.value = theme;
        this.elements.fontSizeInput.value = fontSize;
        this.elements.autoRunToggle.checked = autoRun;

        this.changeTheme(theme);
        this.changeFontSize(fontSize);
        this.updateProjectsList();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        new LCAPlayGround();
    } catch (error) {
        console.error('Failed to initialize LCA Play Ground:', error);
    }
});