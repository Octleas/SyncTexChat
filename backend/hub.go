package main

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Hub struct {
	rooms map[string]*Room
	mu sync.Mutex
}

type Room struct {
	hub *Hub
	id string
	pending int
	clients map[*Client]bool
	broadcast chan []byte
	register chan *Client
	unregister chan *Client
}

type Client struct {
	hub *Hub
	room *Room
	conn *websocket.Conn
	send chan []byte
}

func NewHub() *Hub {
	return &Hub {
		rooms: make(map[string]*Room),
	}
}

func (h *Hub) JoinRoom(roomId string, client *Client) {
	h.mu.Lock()
	room, ok := h.rooms[roomId]
	if !ok {
		room = &Room{
			hub: h,
			id: roomId,
			pending: 0,
			clients: make(map[*Client]bool),
			broadcast: make(chan []byte),
			register: make(chan *Client),
			unregister: make(chan *Client),
		}
		h.rooms[roomId] = room
		go room.run() // 新しいroomができた時、そのroom専用のgoroutineを起動
	}
	room.pending++
	h.mu.Unlock()

	client.room = room
	room.register <- client
}