package main

import (
	"log"

	"github.com/gorilla/websocket"
)

//readPump: ブラウザから送られてきたデータを受信し、Roomへ流す
func (c *Client) readPump() {
	defer func() {
		c.room.unregister <- c
		c.conn.Close()
	}()
	for {
		//データが来るまで待機
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log. Printf("error: %v", err)
			}
			break
		}
		//受け取ったデータをRoomのbroadcast(chan)へ投げ込む
		c.room.broadcast <- message
	}
}

//writePump: Roomから受け取ったデータをブラウザへ送信する
func (c *Client) writePump() {
	defer func() {
		c.conn.Close()
	}()

	for {
		//Clientのsendチャネルにデータが届くまで待機
		message, ok := <-c.send
		if !ok {
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		// 受け取ったデータをブラウザへテキスト送信
		err := c.conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			return
		}
	}
}