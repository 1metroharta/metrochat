# Firebase Realtime Database — полный список правил MetroChat b6.0.0

Файл: `database.rules.json` (единственный источник истины). Ниже — **каждый узел**, у которого есть собственное правило чтения или записи. Если у узла стоит «наследуется», действует ближайшее правило выше.

> В Realtime Database доступ выдаётся, если правило разрешает его на самом узле или на любом родительском пути. Поэтому корень закрыт (`.read: false`, `.write: false`), а каждый рабочий узел открывается отдельно.

## Почему «55% функций» упирались в Firebase

| Что не работало | Причина | Исправление в b6.0.0 |
| --- | --- | --- |
| Бусты канала | `channels/{id}/boostTotal` не имел своего правила: запись падала в правило `channels/{id}` «только владелец/админ», и весь атомарный `update` (баланс + буст + итог) отклонялся | `boostTotal` разрешён любому авторизованному, но только на **прирост** (0…500 за операцию) и до 1 000 000; добавлены `boostLog` и валидация `boosts/{uid}` |
| Лайки комментариев канала | лайк писали внутрь `channel_comments/{cid}/{mid}/{commentId}/likes`, а правило комментария требует `newData.uid === auth.uid` — у карты лайков нет `uid` | отдельный узел `channel_comment_likes/{cid}/{mid}/{commentId}/{uid}`, писать может только свой `uid` |
| Лайки комментариев историй | та же причина внутри `story_comments` | отдельный узел `story_comment_likes/{storyId}/{commentId}/{uid}` |
| Счётчик комментариев историй | не было узла `story_stats` | `story_stats/{storyId}/cc` — число, пишет автор комментария |
| Статистика канала | `channel_stats` был открыт целиком на запись любому авторизованному: любой мог перезаписать чужие просмотры и лайки | запись разнесена по путям: `views/{mid}/{uid}`, `likes/{mid}/{uid}`, `cc/{mid}`, `growth/{day}/{uid}` — только свой `uid` |
| Настройки/оформление канала | не было валидации полей `settings`, `accent`, `emoji`, `badge`, `username` | добавлены правила владельца/админа и ограничения длины |
| Ответы на комментарии | поля `replyTo`/`replyName` не были описаны в валидации | добавлены в `channel_comments` и `story_comments` |
| Модерация | не было узла запрета комментариев | `channel_mutes/{cid}/{uid}` — пишут только владелец/админы |

Исторические причины прошлых отказов (уже исправлены в b5.1.x): `bans/{uid}/until > now` при отсутствии бана давал `null` и отклонял запись; `call_inbox` проверял `callerId` на уровне всего списка звонков; профиль требовал поле `verified`.

## Полный список узлов

| Узел | Чтение | Запись |
| --- | --- | --- |
| `/` | False | False |
| `app_config` | auth != null | False |
| `users` | auth != null | — (наследуется) |
| `users/$uid` | — (наследуется) | auth.uid === $uid && (root.child('admins').child(auth.uid).exists() \|\| !newData.child('verified').exists() \|\| newData.child('verified').val() === data.child('verified').val() \|\| (!data.exists() && newData.child('verified').val() === false)) |
| `usernames` | auth != null | — (наследуется) |
| `usernames/$n` | — (наследуется) | auth != null && (!data.exists() \|\| data.val() === auth.uid) |
| `presence` | auth != null | — (наследуется) |
| `presence/$uid` | — (наследуется) | auth.uid === $uid |
| `galochka` | auth != null | False |
| `galochka/$uid` | — (наследуется) | auth != null && root.child('admins').child(auth.uid).exists() |
| `galochka/$uid/requestedAt` | — (наследуется) | auth != null && auth.uid === $uid && !data.exists() |
| `galochka/$uid/socialLinks` | — (наследуется) | auth != null && auth.uid === $uid |
| `galochka/$uid/confirmed` | — (наследуется) | auth != null && ((auth.uid === $uid && newData.val() === false) \|\| root.child('admins').child(auth.uid).exists()) |
| `galochka/$uid/paid` | — (наследуется) | auth != null && auth.uid === $uid |
| `user_security/$uid` | auth.uid === $uid | auth.uid === $uid |
| `device_sessions/$uid` | auth.uid === $uid | auth.uid === $uid |
| `age_verify/$uid` | auth.uid === $uid | auth.uid === $uid |
| `gift_earn/$uid` | auth.uid === $uid | auth.uid === $uid |
| `user_bots/$uid` | auth.uid === $uid | auth.uid === $uid |
| `bot_chats/$uid` | auth.uid === $uid | auth.uid === $uid |
| `bot_msgs/$uid` | auth.uid === $uid | auth.uid === $uid |
| `user_saved/$uid` | auth.uid === $uid | auth.uid === $uid |
| `user_settings/$uid` | auth != null | auth.uid === $uid |
| `user_blocked/$uid` | auth != null | auth.uid === $uid |
| `gift_wheel/$uid` | auth != null | auth.uid === $uid |
| `auction_credits/$uid` | auth != null | auth.uid === $uid |
| `gift_quiz_claims/$uid` | auth.uid === $uid | auth.uid === $uid |
| `user_chats/$uid` | auth.uid === $uid | auth != null && auth.uid === $uid |
| `user_chats/$uid/$chatId` | — (наследуется) | auth != null && (auth.uid === $uid \|\| ($chatId.beginsWith('dm_') && ($chatId.contains('_' + auth.uid + '_') \|\| $chatId.endsWith('_' + auth.uid)) && ($chatId.contains('_' + $uid + '_') \|\| $chatId.endsWith('_' + $uid))) \|\| (root.child('chats').child($chatId).child('members').child($uid).val() === true && root.child('chats').child($chatId).child('members').child(auth.uid).val() === true) \|\| (root.child('channels').child($chatId).child('members').child($uid).val() === true && (root.child('channels').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('channels').child($chatId).child('admins').child(auth.uid).val() === true))) |
| `gift_inventory/$uid` | auth != null | — (наследуется) |
| `gift_inventory/$uid/$item` | — (наследуется) | auth != null && (auth.uid === $uid \|\| (newData.child('fromUid').val() === auth.uid && newData.child('toUid').val() === $uid)) |
| `gift_transfers` | auth != null | — (наследуется) |
| `gift_transfers/$id` | — (наследуется) | auth != null && !data.exists() && newData.child('from').val() === auth.uid && newData.child('to').val() !== auth.uid |
| `gift_wallet/$uid` | auth != null | — (наследуется) |
| `gift_wallet/$uid/balance` | — (наследуется) | auth != null && (auth.uid === $uid \|\| (!data.exists() && newData.isNumber() && newData.val() === 0) \|\| (data.isNumber() && newData.isNumber() && newData.val() >= data.val() && newData.val() - data.val() <= 1000000)) |
| `chats/$chatId` | auth != null | auth != null && (!data.exists() ? newData.child('ownerId').val() === auth.uid : (data.child('ownerId').val() === auth.uid \|\| data.child('admins').child(auth.uid).val() === true)) |
| `chats/$chatId/members` | — (наследуется) | auth != null && newData.child(auth.uid).val() === true |
| `chats/$chatId/members/$member` | — (наследуется) | auth != null && ($member === auth.uid \|\| root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true) |
| `chats/$chatId/admins/$member` | — (наследуется) | auth != null && ($member === auth.uid \|\| root.child('chats').child($chatId).child('ownerId').val() === auth.uid) |
| `chats/$chatId/ownerId` | — (наследуется) | auth != null && (data.val() === auth.uid \|\| root.child('chats').child($chatId).child('ownerId').val() === auth.uid) |
| `chats/$chatId/code` | — (наследуется) | auth != null && (root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true) |
| `chats/$chatId/settings` | — (наследуется) | auth != null && (root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true) |
| `chats/$chatId/themeId` | — (наследуется) | auth != null && (root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true) |
| `messages/$chatId` | auth != null && (($chatId.beginsWith('dm_') && ($chatId.contains('_' + auth.uid + '_') \|\| $chatId.endsWith('_' + auth.uid))) \|\| root.child('chats').child($chatId).child('members').child(auth.uid).val() === true \|\| root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true \|\| root.child('channels').child($chatId).child('members').child(auth.uid).val() === true \|\| root.child('channels').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('channels').child($chatId).child('admins').child(auth.uid).val() === true) | auth != null && !newData.exists() && (root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('channels').child($chatId).child('ownerId').val() === auth.uid) |
| `messages/$chatId/$msg` | — (наследуется) | auth != null && ( !root.child('bans').child(auth.uid).child('until').exists() \|\| root.child('bans').child(auth.uid).child('until').val() <= now ) && (!data.exists() ? newData.child('senderId').val() === auth.uid && (root.child('channels').child($chatId).exists() ? (root.child('channels').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('channels').child($chatId).child('admins').child(auth.uid).val() === true) : true) && (root.child('chats').child($chatId).child('settings').child('onlyAdminsPost').val() === true ? (root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true) : true) : data.child('senderId').val() === auth.uid) |
| `messages/$chatId/$msg/readBy/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `messages/$chatId/$msg/reactions/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `messages/$chatId/$msg/poll/votes/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `messages/$chatId/$msg/pinned` | — (наследуется) | auth != null && (($chatId.beginsWith('dm_') && ($chatId.contains('_' + auth.uid + '_') \|\| $chatId.endsWith('_' + auth.uid))) \|\| root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true \|\| root.child('channels').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('channels').child($chatId).child('admins').child(auth.uid).val() === true) |
| `media/$chatId` | auth != null && (($chatId.beginsWith('dm_') && ($chatId.contains('_' + auth.uid + '_') \|\| $chatId.endsWith('_' + auth.uid))) \|\| root.child('chats').child($chatId).child('members').child(auth.uid).val() === true \|\| root.child('chats').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('chats').child($chatId).child('admins').child(auth.uid).val() === true \|\| root.child('channels').child($chatId).child('members').child(auth.uid).val() === true \|\| root.child('channels').child($chatId).child('ownerId').val() === auth.uid \|\| root.child('channels').child($chatId).child('admins').child(auth.uid).val() === true) | — (наследуется) |
| `media/$chatId/$msgId` | — (наследуется) | auth != null && (auth.uid === data.child('uid').val() \|\| (( !root.child('bans').child(auth.uid).child('until').exists() \|\| root.child('bans').child(auth.uid).child('until').val() <= now ) && newData.child('uid').val() === auth.uid)) |
| `channels` | auth != null | — (наследуется) |
| `channels/$id` | — (наследуется) | auth != null && (!data.exists() ? newData.child('ownerId').val() === auth.uid : (data.child('ownerId').val() === auth.uid \|\| data.child('admins').child(auth.uid).val() === true)) |
| `channels/$id/ownerId` | — (наследуется) | auth != null && (data.val() === auth.uid \|\| root.child('channels').child($id).child('ownerId').val() === auth.uid) |
| `channels/$id/members/$member` | — (наследуется) | auth != null && ($member === auth.uid \|\| root.child('channels').child($id).child('ownerId').val() === auth.uid \|\| root.child('channels').child($id).child('admins').child(auth.uid).val() === true) |
| `channels/$id/admins/$member` | — (наследуется) | auth != null && ($member === auth.uid \|\| root.child('channels').child($id).child('ownerId').val() === auth.uid) |
| `channels/$id/settings` | — (наследуется) | auth != null && (root.child('channels').child($id).child('ownerId').val() === auth.uid \|\| root.child('channels').child($id).child('admins').child(auth.uid).val() === true) |
| `channels/$id/boostTotal` | — (наследуется) | auth != null && newData.isNumber() && newData.val() >= (data.val() \|\| 0) && newData.val() <= 1000000 && (newData.val() - (data.val() \|\| 0)) <= 500 |
| `channels/$id/boostLog/$entry` | — (наследуется) | auth != null && !data.exists() && newData.child('by').val() === auth.uid |
| `channels/$id/accent` | — (наследуется) | auth != null && (root.child('channels').child($id).child('ownerId').val() === auth.uid \|\| root.child('channels').child($id).child('admins').child(auth.uid).val() === true) |
| `channels/$id/accent2` | — (наследуется) | auth != null && (root.child('channels').child($id).child('ownerId').val() === auth.uid \|\| root.child('channels').child($id).child('admins').child(auth.uid).val() === true) |
| `channels/$id/emoji` | — (наследуется) | auth != null && (root.child('channels').child($id).child('ownerId').val() === auth.uid \|\| root.child('channels').child($id).child('admins').child(auth.uid).val() === true) |
| `channels/$id/badge` | — (наследуется) | auth != null && (root.child('channels').child($id).child('ownerId').val() === auth.uid \|\| root.child('channels').child($id).child('admins').child(auth.uid).val() === true) |
| `channels/$id/username` | — (наследуется) | auth != null && (root.child('channels').child($id).child('ownerId').val() === auth.uid \|\| root.child('channels').child($id).child('admins').child(auth.uid).val() === true) |
| `channels/$id/boosts/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `channels/$id/gifts/$giftId` | — (наследуется) | auth != null && newData.child('from').val() === auth.uid |
| `channel_comments/$channelId` | auth != null | — (наследуется) |
| `channel_comments/$channelId/$commentId` | — (наследуется) | auth != null && ( !root.child('bans').child(auth.uid).child('until').exists() \|\| root.child('bans').child(auth.uid).child('until').val() <= now ) && (!data.exists() ? newData.child('uid').val() === auth.uid : (data.child('uid').val() === auth.uid \|\| root.child('channels').child($channelId).child('ownerId').val() === auth.uid \|\| root.child('channels').child($channelId).child('admins').child(auth.uid).val() === true)) |
| `channel_stats` | auth != null | — (наследуется) |
| `channel_stats/$cid` | — (наследуется) | False |
| `channel_stats/$cid/views/$mid/$viewer` | — (наследуется) | auth != null && $viewer === auth.uid |
| `channel_stats/$cid/likes/$mid/$viewer` | — (наследуется) | auth != null && $viewer === auth.uid |
| `channel_stats/$cid/cc/$mid` | — (наследуется) | auth != null |
| `channel_stats/$cid/growth/$day/$user` | — (наследуется) | auth != null && $user === auth.uid |
| `channel_comment_likes/$cid` | auth != null | — (наследуется) |
| `channel_comment_likes/$cid/$mid/$comment/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `channel_mutes/$cid` | auth != null | — (наследуется) |
| `channel_mutes/$cid/$uid` | — (наследуется) | auth != null && (root.child('channels').child($cid).child('ownerId').val() === auth.uid \|\| root.child('channels').child($cid).child('admins').child(auth.uid).val() === true) |
| `story_comment_likes/$storyId` | auth != null | — (наследуется) |
| `story_comment_likes/$storyId/$comment/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `story_stats/$storyId` | auth != null | — (наследуется) |
| `story_stats/$storyId/cc` | — (наследуется) | auth != null |
| `stories` | auth != null | — (наследуется) |
| `stories/$id` | — (наследуется) | auth != null && ( !root.child('bans').child(auth.uid).child('until').exists() \|\| root.child('bans').child(auth.uid).child('until').val() <= now ) && (root.child('admins').child(auth.uid).exists() \|\| (!data.exists() ? newData.child('uid').val() === auth.uid : data.child('uid').val() === auth.uid)) |
| `stories/$id/views/$uid` | — (наследуется) | auth != null && $uid === auth.uid && (!newData.exists() \|\| newData.isNumber()) |
| `stories/$id/likes` | auth != null | — (наследуется) |
| `stories/$id/likes/$uid` | — (наследуется) | auth != null && $uid === auth.uid && (!newData.exists() \|\| newData.val() === true) |
| `story_media` | auth != null | — (наследуется) |
| `story_media/$id` | — (наследуется) | auth != null && ( !root.child('bans').child(auth.uid).child('until').exists() \|\| root.child('bans').child(auth.uid).child('until').val() <= now ) && (root.child('admins').child(auth.uid).exists() \|\| (!data.exists() ? newData.child('uid').val() === auth.uid : data.child('uid').val() === auth.uid)) |
| `story_comments/$storyId` | auth != null | auth != null && !newData.exists() && (root.child('stories').child($storyId).child('uid').val() === auth.uid \|\| root.child('admins').child(auth.uid).exists()) |
| `story_comments/$storyId/$commentId` | — (наследуется) | auth != null && ( !root.child('bans').child(auth.uid).child('until').exists() \|\| root.child('bans').child(auth.uid).child('until').val() <= now ) && (!data.exists() ? newData.child('uid').val() === auth.uid : (data.child('uid').val() === auth.uid \|\| root.child('stories').child($storyId).child('uid').val() === auth.uid)) |
| `calls/$callId` | auth != null && (auth.uid === data.child('callerId').val() \|\| auth.uid === data.child('calleeId').val()) | auth != null && (auth.uid === data.child('callerId').val() \|\| auth.uid === data.child('calleeId').val() \|\| (!data.exists() && newData.child('callerId').val() === auth.uid)) && ( !root.child('bans').child(auth.uid).child('until').exists() \|\| root.child('bans').child(auth.uid).child('until').val() <= now ) |
| `calls/$callId/sdp/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `calls/$callId/cand/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `call_inbox/$uid` | auth.uid === $uid | — (наследуется) |
| `call_inbox/$uid/$callId` | — (наследуется) | auth != null && (auth.uid === $uid \|\| data.child('callerId').val() === auth.uid \|\| newData.child('callerId').val() === auth.uid) |
| `call_log/$uid` | auth.uid === $uid | auth.uid === $uid |
| `typing/$uid` | auth != null | auth.uid === $uid |
| `typing_v2/$chatId` | auth != null && (($chatId.beginsWith('dm_') && ($chatId.contains('_' + auth.uid + '_') \|\| $chatId.endsWith('_' + auth.uid))) \|\| root.child('chats').child($chatId).child('members').child(auth.uid).val() === true \|\| root.child('channels').child($chatId).child('members').child(auth.uid).val() === true) | — (наследуется) |
| `typing_v2/$chatId/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `typing_v/$chatId` | auth != null | — (наследуется) |
| `typing_v/$chatId/$uid` | — (наследуется) | auth != null && $uid === auth.uid |
| `live_geo` | auth != null | auth != null |
| `scheduled/$uid` | auth.uid === $uid | auth.uid === $uid |
| `auctions` | auth != null | auth != null |
| `auction_bids` | auth != null | auth != null |
| `paid_content/$t` | — (наследуется) | auth != null && !data.exists() && newData.child('meta/from').val() === auth.uid |
| `paid_content/$t/meta` | auth != null | — (наследуется) |
| `paid_content/$t/text` | auth != null && (data.parent().child('meta/from').val() === auth.uid \|\| data.parent().child('unlocked').child(auth.uid).exists()) | — (наследуется) |
| `paid_content/$t/unlocked/$u` | — (наследуется) | auth.uid === $u |
| `service_orders/$owner` | auth.uid === $owner | — (наследуется) |
| `service_orders/$owner/$o` | — (наследуется) | auth != null && !data.exists() && newData.child('buyer').val() === auth.uid |
| `admins/$uid` | auth.uid === $uid | False |
| `support_chats` | auth != null && root.child('admins').child(auth.uid).exists() | — (наследуется) |
| `support_chats/$uid` | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) | — (наследуется) |
| `support_chats/$uid/meta` | — (наследуется) | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) |
| `support_chats/$uid/messages` | — (наследуется) | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) |
| `reports` | auth != null && root.child('admins').child(auth.uid).exists() | — (наследуется) |
| `reports/$target` | auth != null && (auth.uid === $target \|\| data.child(auth.uid).exists() \|\| root.child('admins').child(auth.uid).exists()) | — (наследуется) |
| `reports/$target/$from` | — (наследуется) | auth != null && auth.uid === $from && $from !== $target |
| `bans` | auth != null && root.child('admins').child(auth.uid).exists() | — (наследуется) |
| `bans/$uid` | auth != null | auth != null && (root.child('admins').child(auth.uid).exists() \|\| (auth.uid !== $uid && !data.exists() && newData.child('automatic').val() === true && newData.child('by').val() === auth.uid && root.child('reports').child($uid).child(auth.uid).exists())) |
| `ban_history/$uid` | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) | auth != null && root.child('admins').child(auth.uid).exists() |
| `ban_appeals` | auth != null && root.child('admins').child(auth.uid).exists() | — (наследуется) |
| `ban_appeals/$uid` | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) | auth != null && auth.uid === $uid |
| `ban_notices/$uid` | auth != null && auth.uid === $uid | auth != null && root.child('admins').child(auth.uid).exists() |
| `shops` | auth != null | — (наследуется) |
| `shops/$uid` | — (наследуется) | auth.uid === $uid |
| `shop_orders` | auth != null | — (наследуется) |
| `shop_orders/$id` | — (наследуется) | auth != null && (!data.exists() ? newData.child('buyer').val() === auth.uid : data.child('seller').val() === auth.uid) |
| `shop_reviews` | auth != null | — (наследуется) |
| `shop_reviews/$id` | — (наследуется) | auth != null && !data.exists() && newData.child('buyer').val() === auth.uid && root.child('shop_orders').child(newData.child('orderId').val()).child('buyer').val() === auth.uid |
| `user_status` | auth != null | — (наследуется) |
| `user_status/$uid` | auth != null | auth.uid === $uid |
| `phone_requests` | auth != null && root.child('admins').child(auth.uid).exists() | — (наследуется) |
| `phone_requests/$uid` | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) |
| `user_phones/$uid` | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) |
| `verification_orders` | auth != null && root.child('admins').child(auth.uid).exists() | — (наследуется) |
| `verification_orders/$uid` | auth != null && (auth.uid === $uid \|\| root.child('admins').child(auth.uid).exists()) | auth != null && (root.child('admins').child(auth.uid).exists() \|\| (auth.uid === $uid && newData.child('status').val() === 'pending' && (!data.exists() \|\| data.child('status').val() === 'rejected'))) |
