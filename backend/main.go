package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
//websocket.Upgrader: HTTPプロトコル→WebSocketプロトコルへ
//CheckOrigin どのドメインからの接続を許可するか、return true につき何きてもtrueで返してる

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	//wとrを統合しているイメージ
	if err != nil {
		log.Fatal(err)
	}
	defer ws.Close()
	//handleConnectionsが終わる時にwsを閉じる
	fmt.Println("Connected")
	for {
		messageType, p, err := ws.ReadMessage()
		//wsを用いてデータを受信
		if err != nil {
			fmt.Println("Disconnected: ", err)
			break
		}
		fmt.Printf("Received: %s\n", p)

		err = ws.WriteMessage(messageType, p)
		//wsを用いてデータを書きこみ
		if err != nil {
			fmt.Println("Sending Error:", err)
			break
		}
	}
}

func main() {
	hub := NewHub()

	http.HandleFunc("/ws/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(r.URL.Path, "/") //URLからIDを抽出
		if len(parts) < 3 || parts[2] == "" {
			http.Error(w, "Room ID is Null", http.StatusBadRequest)
			return
		}
		roomId := parts[2]

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("Failure upgrade: ", err)
			return
		}

		room := hub.GetOrCreateRoom(roomId)

		client := &Client{
			hub: hub,
			room: room,
			conn: conn,
			send: make(chan []byte, 256),
		}

		client.room.register <- client

		go client.writePump()
		go client.readPump()
	})

	fmt.Println("Server Ready: http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("Not Server Ready: ", err)
	}
}