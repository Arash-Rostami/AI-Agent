document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-form');
    const chatPage = document.getElementById('messages');

    import('./modules/ThemeToggler.js')
        .then(({default: ThemeToggle}) => new ThemeToggle('theme-toggle'))
        .catch(err => console.error('ThemeToggler failed (App continuing):', err));

    // <=> LOGIN PAGE <=>
    if (loginPage) {
        import('./modules/LoginHandler.js')
            .then(({default: LoginHandler}) => new LoginHandler('login-form'))
            .catch(err => console.error('CRITICAL: LoginHandler failed:', err));
    }

    // <=> CHAT PAGE <=>
    if (chatPage) {
        // Instant-loading Core Modules
        Promise.all([
            import('./modules/ChatHandler.js'),
            import('./modules/FontSizeHandler.js')
        ])
            .then(([{default: ChatHandler}, {default: FontSizeHandler}]) => {
                new ChatHandler();
                new FontSizeHandler();
            })
            .catch(err => console.error('CRITICAL: Chat core failed:', err));

        // Lazy-loading Other Modules
        const idle = window.requestIdleCallback || (fn => setTimeout(fn, 500));

        idle(() => {
            const loadModule = (path, ClassName, ...args) => {
                import(path)
                    .then(({default: Module}) => new Module(...args))
                    .catch(err => console.error(`${ClassName} failed to load:`, err));
            };

            loadModule('./modules/HistoryHandler.js', 'HistoryHandler');
            loadModule('./modules/ModalHandler.js', 'ModalHandler');
            loadModule('./modules/LogoutHandler.js', 'LogoutHandler', 'logout-btn');
            loadModule('./modules/SyncHandler.js', 'SyncHandler', 'sync-btn');
            loadModule('./modules/SettingsHandler.js', 'SettingsHandler');
            loadModule('./modules/MenuHandler.js', 'MenuHandler');
            loadModule('./modules/PinHandler.js', 'PinHandler');
        }, {timeout: 2000});
    }
});