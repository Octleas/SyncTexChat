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

func (h *Hub) GetOrCreateRoom(roomId string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[roomId]; ok {
		return room
	}

	room := &Room {
		clients: make(map[*Client]bool),
		broadcast: make(chan []byte),
		register: make(chan *Client),
		unregister: make(chan *Client),
	}

	h.rooms[roomId] = room
	go room.run() // 新しいroomができた時、そのroom専用のgoroutineを起動
	return room
}