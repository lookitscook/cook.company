
// duluth-kiosmode.js v1.0.0
(function(){

    var ACTIVITY_EVENTS = [
        'mousedown', 'mousemove', 'keydown',
        'scroll', 'touchstart'
    ];

    var CONFIG_DEFAULTS = {
        inactivityTimeout: 1000 * 60 * 5,
        screensaverUrl: 'https://docs.google.com/presentation/d/1thc0QfGRwNdybBNjBdgPMyMGVbCKo4lHwytV6qFeaDM/embed?start=true&loop=true&delayms=5000&rm=minimal',
        clearCookies: true,
        clearLocalStorage: true,
        showNav: true,
        whitelist: '*.duluthtrading.com *.paypal.com *.ultipro.com',
        allowPrint: false,
        disallowUpload: true,
        hideCursor: true,
        disableContextMenu: true,
        disableDrag: true,
        disableTouchHighlight: true,
        disableSelection: true,
        keepAwake: true
    };

    var config = {};
    if(typeof _kioskmode_config !== "undefined")
        config = _kioskmode_config;

    function isNormalInteger(str) {
        var n = Math.floor(Number(str));
        return n !== Infinity && String(n) === str && n >= 0;
    }

    function parseUrlParam(p){
        if(!p) return;
        if(p.toLowerCase() === 'true') return true;
        if(p.toLowerCase() === 'false') return false;
        if(isNormalInteger(p)) return parseInt(p);
        return p;
    }

    var url = new URL(window.location.href);
    for (var key of Object.keys(CONFIG_DEFAULTS)) {
        var urlParamValue = parseUrlParam(url.searchParams.get(key));
        if(typeof urlParamValue !== "undefined"){
            config[key] = urlParamValue;
        }else if(!config[key])
            config[key] = CONFIG_DEFAULTS[key];
    }

    function addStyle(css){
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet){
            // This is required for IE8 and below.
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);
    }

    if(window.self !== window.top){
        // --------- IFRAME ---------

        //notify parent on user activity
        var innerIframeActivity = function activity(){
            window.top.postMessage('kioskmode:active', '*')
        }

        ACTIVITY_EVENTS.forEach(function(eventName) {
            document.addEventListener(eventName, innerIframeActivity, true);
        });

        //disable functionality as configured
        var innerCss = "";
        if (!config.allowPrint) 
            innerCss += "@media print{ body {display:none;} }\n";
        if (config.disallowUpload)
            document.querySelectorAll('input[type=file]').forEach(function(f){ f.disabled = true });
        if (config.hideCursor)
            innerCss += "*{cursor:none;}\n";
        if (config.disableContextMenu)
            window.oncontextmenu = function(){return false};
        if (config.disableDrag)
            window.ondragstart = function(){return false};
        if (config.disableTouchHighlight)
            innerCss += "*{-webkit-tap-highlight-color: rgba(0,0,0,0); -webkit-touch-callout: none;}\n";
        if (config.disableSelection)
            innerCss += "*{-webkit-user-select: none; user-select: none;}\n";
        addStyle(innerCss);

    }else{
        // --------- OUTER FRAME ---------

        var inactivityTimeout, screensaverIframe;
        document.getElementsByTagName('body')[0].innerHTML = '';

        var outerCss = 'body{margin:0;padding:0;overflow:hidden}#kioskmode_outer,#kioskmode_outer iframe,#kioskmode_screensaver{border:none;position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;z-index:1}#kioskmode_screensaver{z-index:2;pointer-events:none;background:#fff;overflow:hidden}body.kioskmode_hasnav #kioskmode_outer{top:48px}body.kioskmode_hasnav #kioskmode_nav{height:48px;width:100%;position:absolute;top:0;left:0;right:0;background:#000}body.kioskmode_hasnav #kioskmode_nav a{position:relative;display:block;float:left;height:48px;width:48px;text-align:center;line-height:48px;color:#fff;text-decoration:none;font-family:monospace;font-size:32px}body.kioskmode_hasnav #kioskmode_nav a:hover{background:#222}';
        addStyle(outerCss);

        var reset = function reset(){
            if(config.clearCookiesOnReset){
                var cookies = document.cookie.split(";");
                for (var i = 0; i < cookies.length; i++) {
                    var cookie = cookies[i];
                    var eqPos = cookie.indexOf("=");
                    var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
                }
            }
            if(config.clearLocalStorageOnReset){
                localStorage.clear();
            }
            window.location.reload(); 
        }

        //strip scripts from head
        var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script');
        for(var i = 0; i < scripts.length; i++){
            if(scripts[i].id !== 'kmjs'){
                scripts[i].parentNode.removeChild(scripts[i]);
            }
        }

        if(config.showNav){
            document.body.classList.add("kioskmode_hasnav");
            var nav = document.createElement('nav');
            nav.id = "kioskmode_nav";

            var homeBtn = document.createElement('a');
            homeBtn.setAttribute('href','javascript:document.getElementById("kioskmode_content").setAttribute("src", window.location.href)');
            homeBtn.innerHTML = "&#8962;";
            nav.appendChild(homeBtn);

            var backBtn = document.createElement('a');
            backBtn.setAttribute('href','javascript:document.getElementById("kioskmode_content").contentWindow.history.back()' )
            backBtn.innerHTML = "&#8592;";
            nav.appendChild(backBtn);

            var refreshBtn = document.createElement('a');
            refreshBtn.setAttribute('href','javascript:document.getElementById("kioskmode_content").contentWindow.location.reload(true)');
            refreshBtn.innerHTML = "&#8635;";
            nav.appendChild(refreshBtn);

            document.body.appendChild(nav);
        }

        //wrap the page in an iframe
        var outerWrapper = document.createElement('div');
        outerWrapper.id = "kioskmode_outer";

        var outerIframe = document.createElement('iframe');
        outerIframe.id = "kioskmode_content";
        outerIframe.src = window.location.href;
        outerIframe.onerror = function(e){
            console.error(e);
            outerIframe.src = window.location.href;
        };
        
        outerIframe.setAttribute('allow', "fullscreen");
        if(config.whitelist) 
            outerIframe.setAttribute('csp', "navigate-to "+location.host+" "+config.whitelist+";");
 

        outerWrapper.appendChild(outerIframe);
        document.body.appendChild(outerWrapper);

        //handle activity
        var activity = function(e){
            if(inactivityTimeout){
                clearTimeout(inactivityTimeout);
            }
            if(config.inactivityTimeout){
                inactivityTimeout = setTimeout(reset, config.inactivityTimeout);
            }
            if(screensaverIframe){
                screensaverIframe.remove();
            }
        };

        window.onmessage = function(e){
            if (e.data == 'kioskmode:active') {
                activity(e);
            }
        };

        ACTIVITY_EVENTS.forEach(function(e) {
            document.addEventListener(e, activity, true);
        });

        //start screensaver
        if(config.screensaverUrl){
            screensaverIframe = document.createElement('iframe');
            screensaverIframe.src = config.screensaverUrl;
            screensaverIframe.setAttribute('id', 'kioskmode_screensaver');
            screensaverIframe.setAttribute('allow', "fullscreen");
            screensaverIframe.setAttribute('allowTransparency', false);
            document.body.appendChild(screensaverIframe);
        }
        
        // reset the iframe if we've navigated to another domain
        setInterval(function(){
            try {
                // this will fail on cross-origin requests
                var currentIframeUrl = outerIframe.contentWindow.location.href; 
            }catch(e){
                outerIframe.src = window.location.href;
            }
        }, 1000);

        //keep awake if configured and supported
        if(config.keepAwake){
            try {
                navigator.wakeLock.request('screen');
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        }
    }
})();