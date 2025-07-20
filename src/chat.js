const websocketURL = "ws://localhost:7472";
const debug = true;

// Create Pronoun lookup objects
const pronouns_lookup = {};
const user_pronouns = {};

function get(endpoint) {
    // Call the alejo.io pronouns API and return the result
    return fetch(`https://pronouns.alejo.io/api/${endpoint}`)
        .then(resp => resp.json(), null);
}


async function build_pronoun_lookup() {
    // Get the lookup of pronoun keys to pronoun string literals and update the
    // lookup object
    const data = await get('pronouns');
    if ( Array.isArray(data) ) {
        for(const item of data) {
            pronouns_lookup[item.name] = item.display;
        }
    }
}


async function lookup_user_pronouns(user_login) {
    // Make sure we've got the lookup of pronoun keys
    if (Object.keys(pronouns_lookup).length === 0) {
        await build_pronoun_lookup();
    }
    // Get the user's pronouns from the service
    let data = await get(`users/${user_login}`);
    if ( Array.isArray(data) ) {
        if( data.length == 1) {
            pronoun_id = data[0]['pronoun_id'];
        } else {
            pronoun_id = null;
        }
    } else {
        pronoun_id = null;
    }
    // Return the pronouns or a blank string if there were none
    if (pronoun_id in pronouns_lookup) {
        return pronouns_lookup[pronoun_id];
    } else {
        return '';
    }
}


async function add_user_pronoun_cache(chat_msg) {
    // Get the users pronouns from the alejo service and update the user cache
    let user_login = chat_msg.nickname;
    let pronouns = await lookup_user_pronouns(user_login)
    user_pronouns[user_login] = {'cache_time': Date.now(),
        'pronouns': pronouns}
    console.log(`Caching ${user_login} pronouns - ${pronouns}`)
}


async function update_user_pronoun_cache(chat_msg) {
    // Update the user cache with fresh data from the alejo service
    let user_login = chat_msg.nickname;
    let pronouns = await lookup_user_pronouns(user_login)
    user_pronouns[user_login]['pronouns'] = pronouns;
    user_pronouns[user_login]['cache_time'] = Date.now();
    console.log(`Refreshed cache for ${user_login}`)
}


function check_cache_time(user_login) {
    // Check if the user cache is within 5 minutes of the last user lookup
    if ( Date.now() <= user_pronouns[user_login]['cache_time'] + 500000 ) {
        return true;
    } else {
        return false;
    };
}


function write_pronouns(chat_msg) {
    // Write the pronouns from the user cache to the chat message
    let user_login = chat_msg.nickname;
    let pronoun_text = user_pronouns[user_login]['pronouns'];
    let msg_block = document.getElementById(chat_msg.id);
    let pronoun_block = msg_block.getElementsByClassName('pronoun_tag')[0];
    pronoun_block.innerHTML = pronoun_text;
}


async function add_pronouns(chat_msg) {
    // Add user pronouns if they exist to the chat message
    if (chat_msg.nickname in user_pronouns) {
        if (check_cache_time(chat_msg.nickname)) {
            write_pronouns(chat_msg);
        } else {
            await update_user_pronoun_cache(chat_msg);
            write_pronouns(chat_msg)
        }
    } else {
        await add_user_pronoun_cache(chat_msg);
        write_pronouns(chat_msg)
    }
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
    // Add placeholder for pronouns
    let pronoun_p = document.createElement('p');
    pronoun_p.className = 'pronoun_tag';
    user_div.appendChild(pronoun_p);
    msg_div.appendChild(user_div);
    // Main message text
    let text_div = document.createElement('div');
    text_div.className = 'msg_text';
    let text_p = document.createElement('p');
    if (chat_msg.msg_text.includes('ACTION')) {
        text_p.className = 'msg_text slash_me';
        let msg_text = chat_msg.msg_text.slice(7, -1);
        text_p.innerHTML = msg_text;
    }
    else {
        text_p.className = 'msg_text';
        text_p.innerHTML = `${chat_msg.msg_text}`;
    }
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
        chat_messages = chat_overlay.getElementsByClassName("chat_message");
        chat_overlay.removeChild(chat_messages[0]);
        // Check again, just in case a couple of messages have tripped over
        clear_out_of_bounds();
    }
}


function delete_chat_messages(chat_msg) {
    // Clear all the chat messages, or all message from a user
    if (chat_msg.username  == "") {
        // teh generic clear chat command has been used
        document.getElementById("chat_overlay").innerHTML = "";
    } else {
        // A user has been banned or timd out
        console.log(`Trying to remove messages for
                    ${chat_msg["target-user-id"]}`);
        const chats = document.getElementsByClassName
        (chat_msg["target-user-id"]);
        while (chats.length > 0) {
            chats[0].parentNode.removeChild(chats[0]);
        }
    }
}


function delete_individual_message(chat_msg) {
    // Find a message and delete it
    document.getElementById(chat_msg["target-msg-id"]).innerHTML = "";
}


function msg_handler(msg) {
    // Main message handler function called from the Websockets client
    if (debug === true) {
        console.log(`[message] Data received from server: ${msg.data}`);
    };
    let chat_msg = JSON.parse(msg.data);
    switch(chat_msg.msg_type) {
        case "privmsg":
            // Most messages are privmsg
            add_chat_msg(chat_msg);
            add_pronouns(chat_msg);
            clear_out_of_bounds();
            break;
        case "clearchat":
            // Clear the entire chat log
            delete_chat_messages(chat_msg);
            break;
        case "clearmsg":
            // Delete an individual message
            delete_individual_message(chat_msg);
            break;
    };
}


function connect() {
    // Connect to the local Websocket server and register the
    // callback functions
    let socket = new WebSocket(websocketURL);
    // Inline function to log on open
    socket.onopen = function(e) {
        console.log("[open] Connection established");
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