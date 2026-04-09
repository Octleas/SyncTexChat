package main

import "fmt"

func (r *Room) run() {
	for {
		select {
		case client := <-r.register:
			//Mutexで排他制御しなくてもrun()でのみclientsへ書き込むため問題ない
			r.clients[client] = true

			r.hub.mu.Lock()
			r.pending--
			r.hub.mu.Unlock()

			fmt.Println("Join the new client")
		
		case client := <-r.unregister:
			// clientが存在しているか確認してdelete
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
				close(client.send) //メモリ解放
				fmt.Println("Leave the client")

				r.hub.mu.Lock()
				if len(r.clients) == 0 && r.pending == 0 {
					delete(r.hub.rooms, r.id)
					r.hub.mu.Unlock()
					return
				}
				r.hub.mu.Unlock()
			}
		
		case message := <-r.broadcast:
			for client := range r.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(r.clients, client)

					r.hub.mu.Lock()
					if len(r.clients) == 0 && r.pending == 0 {
						delete(r.hub.rooms, r.id)
						r.hub.mu.Unlock()
						return
					}
					r.hub.mu.Unlock()
				}
			}
		}
	}
}