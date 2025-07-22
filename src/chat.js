const websocketURL = "ws://localhost:7472";
const messageDisplayTime = 0; // Number of seconds to display a chat message before deleting it, set to 0 for permanent messages
const messageFadeOut = false;
const debug = false;


function fade(element) {
    let opacity = Number(window.getComputedStyle(element).getPropertyValue("opacity"));
    let timer = setInterval(function () {
        if (opacity <= 0.1){
            element.remove();
            clearInterval(timer);
        } else {
            opacity = opacity - 0.1;
            element.style.opacity = opacity;
        }
    }, 50);
}

async function timeout_message(chat_msg) {
    // wait for an amount of time before removing
    const timeout_period = messageDisplayTime * 1000;
    await new Promise(r => setTimeout(r, timeout_period));
    let msg_div = document.getElementById(chat_msg.id);
    if (messageFadeOut === true) {
        fade(msg_div);
    } else {
        msg_div.remove();
    }
}


function replace_emotes(chat_msg) {
    let return_str = chat_msg.msg_text;
    let emote_text = chat_msg.emote_names.join("");
    let msg_strip = return_str.replace(/ /g,"");
    let just_emote = emote_text == msg_strip;
    for(let i = 0; i < chat_msg.emote_names.length; i++) {
        let emote_url = "";
        if(chat_msg.animated_emote_urls[i] != "") {
            emote_url = chat_msg.animated_emote_urls[i]
        } else {
            emote_url = chat_msg.emote_urls[i]
        };
        if (just_emote) {
            emote_url = emote_url.replace(/1\.0$/, '2.0');
        }
        let replace_txt = `<img src="${emote_url}">`;
        return_str = return_str.replace(chat_msg.emote_names[i], replace_txt);
    };
    return return_str;
}


function add_chat_msg(chat_msg) {
    // Start with getting the overlay
    let overlay = document.getElementById('chat_overlay');
    // Create the overall containing div
    let msg_div = document.createElement('div');
    msg_div.id = chat_msg.id;
    msg_div.className = `chat_message ${chat_msg.id}`;
    let user_div = document.createElement('div');
    user_div.className = 'user_details';
    // Add badges
    let badges_div = document.createElement('div');
    badges_div.className = 'chat_badges';
    for (let badge_url of chat_msg.badges) {
        let badge_img = document.createElement('img');
        badge_img.setAttribute('src', badge_url);
        badge_img.setAttribute('class', 'chat_badges');
        badges_div.appendChild(badge_img);
    }
    user_div.appendChild(badges_div);
    // Add the Username
    let name_p = document.createElement('p');
    name_p.className = 'display_name';
    name_p.style = `color:${chat_msg.color}`;
    let name_text = document.createTextNode(`${chat_msg['display-name']}`);
    name_p.appendChild(name_text);
    user_div.appendChild(name_p);
    // Add pronouns
    let pronoun_p = document.createElement('p');
    pronoun_p.className = 'pronoun_tag';
    let pronoun_text = document.createTextNode(chat_msg.pronouns);
    pronoun_p.appendChild(pronoun_text);
    user_div.appendChild(pronoun_p);
    msg_div.appendChild(user_div);
    // Main message text
    let text_div = document.createElement('div');
    text_div.className = 'msg_text';
    let text_p = document.createElement('p');
    let msg_text = replace_emotes(chat_msg);
    if (msg_text.includes('ACTION')) {
        text_p.className = 'msg_text slash_me';
        msg_text = msg_text.slice(7, -1);
    }
    else {
        text_p.className = 'msg_text';
    }
    text_p.innerHTML = msg_text;
    text_div.appendChild(text_p);
    msg_div.appendChild(text_div);
    // Finally add the message to the overlay
    overlay.appendChild(msg_div);
}


function clear_out_of_bounds() {
    // Clear a message that has gone past the top boundary so we don't have half
    // the characters dangling off the top of the overlay
    let chat_overlay = document.getElementById("chat_overlay");
    if (chat_overlay.getBoundingClientRect().y < 0) {
        console.log(chat_overlay.getBoundingClientRect().y);
        let chat_messages = chat_overlay.getElementsByClassName("chat_message");
        chat_overlay.removeChild(chat_messages[0]);
        // Check again, just in case a couple of messages have tripped over
        clear_out_of_bounds();
    }
}


function delete_user_messages(chat_msg) {
    // Clear all the chat messages, or all message from a user
    // A user has been banned or timed out
    console.log(`Trying to remove messages for ${chat_msg.username}`);
    let remove_chats = [];
    let chats = document.getElementsByClassName("display_name");
    for (let chat of chats) {
        if (chat.textContent == chat_msg.username) {
            remove_chats.push(chat.parentNode.parentNode);
        }
    }
    for (let chat of remove_chats) {
        chat.remove();
    }
}


function clear_chat() {
    document.getElementById("chat_overlay").innerHTML = "";
}


function delete_individual_message(chat_msg) {
    // Find a message and delete it
    document.getElementById(chat_msg.message_id).remove();
}


function msg_handler(msg) {
    // Main message handler function called from the Websockets client
    let ws_msg = JSON.parse(msg.data);
    if (debug === true) {
        console.log("[message] ws_msg received from server:");
        console.log(ws_msg);
    };
    switch(ws_msg.name) {
        case "custom-event:chat_overlay_msg":
            add_chat_msg(ws_msg.data);
            clear_out_of_bounds();
            if (messageDisplayTime > 0) {
                timeout_message(ws_msg.data);
            };
            break;
        case "custom-event:chat_overlay_clear":
            clear_chat();
            break;
        case "custom-event:chat_overlay_clear_user":
            delete_user_messages(ws_msg.data);
            break;
        case "custom-event:chat_overlay_clear_msg":
            // Delete an individual message
            delete_individual_message(ws_msg.data);
            break;
    };
}


function connect() {
    // Connect to the local Websocket server and register the
    // callback functions
    let socket = new WebSocket(websocketURL);
    // Inline function to register and log on open
    socket.onopen = function(e) {
        console.log("[open] Connection established");
        socket.send(JSON.stringify({
                "type": "invoke",
                "id": 1,
                "name": "subscribe-events",
                "data": []
            })
        )
    };
    // Main Message handler function
    socket.onmessage = msg_handler;
    // Inline function to deal with on close events and reconnect if not clean
    socket.onclose = function(event) {
        if (event.wasClean) {
            console.log(`[close] Connection closed cleanly,
                        code=${event.code} reason=${event.reason}`);
        } else {
            // e.g. server process killed or network down
            // event.code is usually 1006 in this case
            // Sleep for 5 seconds and try again
            console.log(`[close] Connection died code=${event.code}
                        reason=${event.reason}`);
            setTimeout(function() {connect();}, 5000);
        };
    };
    // Inline function for logging erros
    socket.onerror = function(error) {
        console.log(`[error] ${error.message}`);
    };
}


connect();