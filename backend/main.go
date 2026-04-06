package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	fmt.Println("Server starting on port: " + port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}