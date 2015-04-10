var template = '<div style="margin-bottom: 10px;"><img src="__img_profpic__" style="float: left" /><div style="margin-left: 55px;"><strong>__fb_name__</strong><br/>__fb_msg__</div></div>';

function createMsg(message) {
	var msg = template
				.replace('__img_profpic__', message.profpic)
				.replace('__fb_name__', message.name)
				.replace('__fb_msg__', message.preview);
	return msg;
}

function sendNoty(message) {
	var n = noty({
    	layout: 'topRight',
    	//type: 'success',
    	theme: 'relax',
    	timeout: 7000,
        text: createMsg(message),
        animation: {
            open: 'animated fadeInRight',
            close: 'animated fadeOutRight'
        }
    });
}

chrome.extension.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action == 'new_msg') {
    	//$.noty.closeAll();
    	for (var i = msg.messages.length - 1; i >= 0; i--) {
    		var message = msg.messages[i];
    		sendNoty(message);
    	};
    }
});