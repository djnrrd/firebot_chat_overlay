# Firebot Chat Overlay

## Styling chat messages

Chat messages are styled using the `chat_style.css` file, except for the chatter username, which uses the color provided by twitch.

The following HTML represents an individual chat message, all items surrounded by brackets {} are variable data received from Twitch. Note that the "slash_me" class is only written to the msg_text P tag if the message starts with "/me"

```html
<div id="{twitch_msg_id}" class="chat_message {twitch_msg_id}">
    <div class="user_details">
        <div class="chat_badges">
            <img src="{badge_url}" class="chat_badges">
            <img src="{badge_url}" class="chat_badges">
        </div>
        <p class="display_name" style="color:{twitch_user_color}">{twitch_user_name}</p>
        <p class="pronoun_tag">{twitch_user_pronouns}</p>
    </div>
    <div class="msg_text">
        <p class="msg_text slash_me">{twitch_chat_message}</p>
    </div>
</div>
```
