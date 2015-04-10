var openMessenger = function(tab) {
    if (window.celery_facebook_window == null) {
        return chrome.windows.create({
            url: 'https://www.messenger.com/t',
            type: 'detached_panel',
            focused: true,
            top: 100,
            width: 800,
            height: 560
        }, function(fb_window) {
            window.celery_facebook_window = fb_window;
        });
    } else {
        return chrome.windows.update(window.celery_facebook_window.id, {
            focused: true
        });
    }
};

var last_check = 0;
var re = /(.*)[ ][(](.*)[)]/;
var re_convo_id = /msg_id[.](.*)/;
var re_strip_script = /(<script.+?<\/script>)/g;

function getMinMaxTime(messages) {
    var times = [];
    for (var i = messages.length - 1; i >= 0; i--) {
        var time = messages[i].time;
        times.push(time);
    };
    return {
        max: Math.max.apply(Math, times),
        min: Math.min.apply(Math, times)
    };
}

function concat(messages) {
    var r = 'Facebook Messenger';
    for (var i = messages.length - 1; i >= 0; i--) {
        r = r + "\n \u25CF " + messages[i].name
    };
    return r;
}

function parseHtml(body_text) {
    body_text = body_text.replace(re_strip_script, '');
    var messages_body = $(body_text);
    var all_items = $('.aclb.messages-flyout-item', messages_body);
    return all_items;
}

function parseMessage(all_items) {
    var allMessages = [];
    for (var i = all_items.length - 1; i >= 0; i--) {
        var item = all_items[i];
        var name = $('.lr .title strong', item).first().text();
        var preview = $('.preview span', item).first().text();
        var time_data = $('abbr[data-sigil="timestamp"]', item).first().attr('data-store');
        var profpic = $('.img', item).first().css('background-image').replace('url(', '').replace(')', '');
        allMessages.push({
            name: name,
            preview: preview,
            time: JSON.parse(time_data).time,
            profpic: profpic
        });
    };
    return allMessages;
}

function setBrowserAction(messages) {
    chrome.browserAction.setBadgeText({
        text: (messages.length > 0) ? ("" + messages.length) : ''
    });

    chrome.browserAction.setTitle({
        title: concat(messages)
    });
}

function createNotification(message) {
    var notification = new Notification(message.name, {
        icon: message.profpic,
        body: message.preview,
    });
    notification.onclick = openMessenger;
    setTimeout(function() {
        notification.close();
    }, 5000);
}

function filterMessage(messages) {
    var filter = [];
    for (var i = messages.length - 1; i >= 0; i--) {
        var message = messages[i];
        if (message.time > last_check) {
            filter.push(message);
        }
    };
    return filter;
}

function sendNotyToContent(messages) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        if (tabs.length == 0) return;
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'new_msg',
            messages: messages
        }, function(response) {});
    });
}

function sendNotification(messages) {
    if (messages.length == 0) {
        return;
    }    
    var time = getMinMaxTime(messages);
    if (time.min > last_check) {
        last_check = time.max;
        console.log('' + new Date() + ': set last_check = ' + last_check);
        sendNotyToContent(messages);
    }
}

function checkFacebook() {
    return $.ajax({
        type: "GET",
        dataType: "text",
        url: "https://m.facebook.com/messages",
        cache: false,
        timeout: 20000,
        success: function(data) {            
            var all_items = parseHtml(data);
            var messages = parseMessage(all_items);

            setBrowserAction(messages);
            sendNotification(filterMessage(messages));
        }
    });
}

var schedule = function() {
    checkFacebook();
    return setTimeout((function() {
        return schedule();
    }), 5000);
};

// Execute script
if (Notification.permission !== "granted") {
    Notification.requestPermission();
}
chrome.browserAction.onClicked.addListener(openMessenger);
schedule();

chrome.windows.onRemoved.addListener(function(windowId) {
    if (window.celery_facebook_window != null && window.celery_facebook_window.id == windowId) {
        window.celery_facebook_window = null;
    }
});