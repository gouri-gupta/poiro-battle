import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import useRoomStore from '../store/roomStore'

const useSocket = (roomCode, token) => {
  const socketRef = useRef(null)
  const setRoom = useRoomStore((state) => state.setRoom)

  useEffect(() => {
    if (!roomCode || !token) return

    const socket = io('http://localhost:5000', {
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      socket.emit('join_room', { roomCode, token })
    })

    socket.on('room_updated', ({ room }) => {
      console.log('Room updated:', room.status)
      setRoom(room)
    })

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    return () => {
      socket.disconnect()
    }

  }, [roomCode, token])

  // Return a stable emit function instead of socketRef.current
  // This way RoomPage can call emit() without touching the ref directly
  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data)
    }
  }

  return { emit }
}

export default useSocket