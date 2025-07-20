# Firebot Chat Overlay


## Configuring Firebot Events

Firebot will need to be configured to send events via it's websocket server to the chat overlay.  Three events will need to be configured

### Chat Message

Create an event to trigger on "Chat Message (Twitch)" and give it a suitable name.  Add the effect "Send Custom WebSocket Event"

For the "Event Name" variable, enter `chat_overlay_msg` and for the Event Data variable enter the following JSON

```json
{
  "id": "$chatMessageId",
  "badges": $userBadgeUrls,
  "color": "$chatUserColor",
  "display-name": "$userDisplayName",
  "pronouns": "$pronouns[$userDisplayName, 0, ]",
  "msg_text": "$chatMessage",
  "emote_names": $chatMessageEmoteNames,
  "emote_urls": $chatMessageEmoteUrls,
  "animated_emote_urls": $chatMessageAnimatedEmoteUrls
} 
```

### Chat Cleared

Create an event to trigger on "Chat Cleared (Twitch)" and give it a suitable name.  Add the effect "Send Custom WebSocket Event"

For the "Event Name" variable, enter `chat_overlay_clear`, the Event Data variable can be left blank

### Viewer Banned or Timed Out

Create events to trigger on "Viewer Banned (Twitch)" and "Viewer Timeout (Twitch)" and give them a suitable name.  Add the effect "Send Custom WebSocket Event"

For the "Event Name" variable, enter `chat_overlay_clear_user` and for the Event Data variable enter the following JSON

```json
{
  "username": "$userDisplayName"
}
```

### Chat message Deleted

Create an event to trigger on "Chat Message Deleted (Twitch)" and give it a suitable name.  Add the effect "Send Custom WebSocket Event"

For the "Event Name" variable, enter `chat_overlay_clear_msg` and for the Event Data variable enter the following JSON

```json
{
  "message_id": "$chatMessageId"
}
```


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
