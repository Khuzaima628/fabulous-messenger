// Import necessary React hooks and libraries
import React, { useState, useEffect, useRef } from "react"
import { useParams } from "react-router-dom"
import { Box, Typography, TextField, IconButton, List, ListItem, ListItemAvatar, ListItemText, Avatar, useTheme } from "@mui/material"
import SendIcon from '@mui/icons-material/Send'
import MicIcon from '@mui/icons-material/Mic'
import StopIcon from '@mui/icons-material/Stop'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CloseIcon from '@mui/icons-material/Close'
import { motion } from "framer-motion"
import io from "socket.io-client"
import useCloudinaryUpload from '../utils/cloudinaryUpload';
import supabase, { sendMessage } from '../utils/supabaseClient';


export default function Chat() {
    // Get username from URL parameters
    const { user_name } = useParams()
    const { uploadMedia, uploading, error } = useCloudinaryUpload();

    // State management
    const [newMessage, setNewMessage] = useState("") // Current message being typed
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem(`chatMessages_${user_name}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [system, setsystem] = useState("") // System user identifier
    const [socket, setSocket] = useState(null) // Socket.IO connection
    const [typing_user, settyping_user] = useState("") // Currently typing user
    const [onlineUsers, setOnlineUsers] = useState([user_name]) // List of online users
    const [isRecording, setIsRecording] = useState(false) // Voice recording status
    const [image, setImage] = useState(null)
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
    const [fileType, setFileType] = useState(null); // 'image', 'video', or 'file'
    const [fileName, setFileName] = useState(null);


    // Theme and refs
    const theme = useTheme()
    const audioRef = useRef(null) // Audio notification reference
    const fileInputRef = useRef()

    const handleImageChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Detect file type
        let type = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';

        setFileType(type);
        setFileName(file.name);

        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64 = reader.result;
            setImage(base64); // show preview

            // Upload to Cloudinary
            const result = await uploadMedia(file);
            if (result) {
                setUploadedImageUrl(result.url);
                console.log("✅ Uploaded to Cloudinary:", result);
            }
        };

        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImage(null)
        setUploadedImageUrl(null)
        setFileType(null)
        setFileName(null)
    }

    // Socket.IO connection and event listeners setup
    useEffect(() => {
        // Initialize socket connection to server
        const newSocket = io("http://localhost:4500/");
        setSocket(newSocket);

        // Handle successful connection
        newSocket.on("connect", () => {
            // Create join message
            const joinMessage = {
                user: "System",
                name: user_name,
                text: `${user_name} joined the chat`,
                time: new Date().toLocaleTimeString(),
            };

            // Notify server that user joined
            newSocket.emit("join_user", joinMessage);
            setsystem(joinMessage.user)
            console.log("Connected to server with ", joinMessage.user);
        });

        // Load notification sound
        audioRef.current = new Audio("/recieve_message.mp3");

        // Play notification sound when message received
        const playSound = () => {
            audioRef.current?.play().catch((err) => console.log("Audio play blocked:", err));
        };

        // Listen for incoming messages
        newSocket.on("message", (messageData) => {
            setMessages((prev) => [...prev, messageData]);
            playSound();
        });

        // Listen for typing indicators
        newSocket.on("typing", (typing) => {
            settyping_user(typing);

            // Clear typing indicator after 2 seconds
            setTimeout(() => settyping_user(""), 1000);
        });

        // Listen for online users list updates
        newSocket.on("online_users_list", (list) => {
            setOnlineUsers(list);
            console.log("Online users updated:", list);
        });

        // Cleanup: disconnect socket when component unmounts
        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(`chatMessages_${user_name}`, JSON.stringify(messages));
    }, [messages, user_name]);
    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: true });

            if (!error) {
                // Map user_name to user for consistency
                const mappedData = data.map(msg => ({
                    ...msg,
                    user: msg.user_name || msg.user
                }));
                setMessages(mappedData);
            }
        };
        fetchMessages();
    }, []);


    // Handle sending text messages and images
    const handleSend = async (e) => {
        e.preventDefault()

        // Send image/video/file if available
        if (image && uploadedImageUrl) {
            const emoji = fileType === 'video' ? "🎥" : fileType === 'image' ? "📸" : "📄";
            socket?.emit("message", {
                user: user_name,
                text: `${emoji} ${fileName || 'File'}`,
                [fileType]: uploadedImageUrl,
                fileName: fileName,
                time: new Date().toLocaleTimeString(),
            });
            
            // Save to Supabase
            await sendMessage(
                user_name,
                `${emoji} ${fileName || 'File'}`,
                fileType === 'image' ? uploadedImageUrl : null,
                fileType === 'video' ? uploadedImageUrl : null,
                fileType === 'file' ? uploadedImageUrl : null
            );
            
            setImage(null);
            setUploadedImageUrl(null);
            setFileType(null);
            setFileName(null);
            return;
        }

        // If image is selected but not uploaded yet, wait
        if (image && !uploadedImageUrl) {
            alert('Please wait for upload to complete...');
            return;
        }

        // Don't send empty text messages
        if (!newMessage.trim()) return

        // Create message object
        const messageData = {
            user: user_name,
            text: newMessage,
            time: new Date().toLocaleTimeString(),
            created_at: new Date().toISOString()

        }

        // Emit message to server
        socket?.emit("message", messageData)

        // Clear input field
        await sendMessage(
            user_name,
            newMessage,
            uploadedImageUrl && fileType === 'image' ? uploadedImageUrl : null,
            uploadedImageUrl && fileType === 'video' ? uploadedImageUrl : null,
            uploadedImageUrl && fileType === 'file' ? uploadedImageUrl : null
        );
        setNewMessage("")

    }
    useEffect(() => {
        const channel = supabase
            .channel('messages-channel')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload) => {
                    // Map user_name to user for consistency
                    const mappedMsg = {
                        ...payload.new,
                        user: payload.new.user_name || payload.new.user
                    };
                    setMessages((prev) => [...prev, mappedMsg]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);



    // Voice recording refs
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])

    // Start voice recording
    const startRecording = async () => {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorderRef.current = new MediaRecorder(stream)
        audioChunksRef.current = []

        // Collect audio data chunks
        mediaRecorderRef.current.ondataavailable = (e) => {
            audioChunksRef.current.push(e.data)
        }

        // Handle recording stop
        mediaRecorderRef.current.onstop = () => {
            // Create audio blob from chunks
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            const reader = new FileReader()
            reader.readAsDataURL(audioBlob)

            // Send audio message when conversion complete
            reader.onloadend = () => {
                socket?.emit("message", {
                    user: user_name,
                    text: "🎤 Voice message",
                    audio: reader.result,
                    time: new Date().toLocaleTimeString()
                })
            }
            // Stop all audio tracks
            stream.getTracks().forEach(track => track.stop())
        }

        // Start recording
        mediaRecorderRef.current.start()
        setIsRecording(true)
    }

    // Stop voice recording
    const stopRecording = () => {
        mediaRecorderRef.current?.stop()
        setIsRecording(false)
    }

    return (
        <Box
            display="flex"
            flexDirection="column"
            minHeight="100dvh"
            sx={{
                background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                    pointerEvents: 'none',
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: { xs: 1, sm: 2 },
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Typography variant="h5" sx={{ fontSize: { xs: '1rem', sm: '1.5rem' }, fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>
                        Fabulous Chat <br /> Welcome, {user_name}!
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' }, color: 'rgba(255,255,255,0.7)', textAlign: 'center', display: 'block', mt: 1 }}>
                        {onlineUsers.length} user{onlineUsers.length !== 1 ? 's' : ''} online
                    </Typography>
                </motion.div>
            </Box>


            {/* Message List */}
            <List
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: { xs: 1, sm: 2 },
                    background: 'transparent',
                }}
            >

                {/* Render all messages */}
                {messages.map((msg, index) => {
                    // Check if message is from current user
                    const isMine = user_name === msg.user
                    console.log('Message:', msg.user, 'Current User:', user_name, 'isMine:', isMine);
                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                            {/* Align message based on sender */}
                            <div style={{ display: "flex", justifyContent: isMine ? "end" : "start" }}>
                                <ListItem
                                    sx={{
                                        mb: { xs: 0.5, sm: 1 },
                                        borderRadius: { xs: 1.5, sm: 2 },
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        backdropFilter: 'blur(10px)',
                                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                                        transition: 'all 0.3s ease',
                                        width: 'fit-content',
                                        maxWidth: { xs: '75%', sm: '70%' },
                                        wordWrap: 'break-word',
                                        overflowWrap: 'break-word',
                                        p: { xs: 0.5, sm: 2 },
                                        '&:hover': {
                                            background: 'rgba(255, 255, 255, 0.1)',
                                        },
                                    }}
                                >
                                    <ListItemAvatar sx={{ position: 'relative', minWidth: { xs: 40, sm: 56 } }}>
                                        {/* User avatar with first letter */}
                                        <Avatar sx={{ 
                                            bgcolor: theme.palette.secondary.main,
                                            width: { xs: 32, sm: 40 },
                                            height: { xs: 32, sm: 40 },
                                            fontSize: { xs: '0.875rem', sm: '1.25rem' }
                                        }}>
                                            {msg.user?.[0]?.toUpperCase() || 'U'}
                                        </Avatar>
                                        {/* Online status indicator (green=online, red=offline) */}
                                        {msg.user !== "System" && (
                                            <Box
                                                sx={{
                                                    width: { xs: "8px", sm: "9px" },
                                                    height: { xs: "8px", sm: "9px" },
                                                    background: onlineUsers.includes(msg.user)
                                                        ? "#4caf50"
                                                        : "#f44336",
                                                    borderRadius: "50%",
                                                    border: { xs: '1.5px solid rgba(255, 255, 255, 0.9)', sm: '2px solid rgba(255, 255, 255, 0.9)' },
                                                    position: "absolute",
                                                    bottom: { xs: "0px", sm: "1px" },
                                                    right: { xs: "8px", sm: "14px" },
                                                }}
                                            />
                                        )}
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1" sx={{ 
                                                color: '#fff', 
                                                fontWeight: 'bold',
                                                fontSize: { xs: '0.8rem', sm: '1rem' }
                                            }}>
                                                {msg.user}
                                            </Typography>
                                        }
                                        secondary={
                                            <>
                                                {/* Message text and timestamp */}
                                                <Typography variant="body2" sx={{ 
                                                    color: 'rgba(255, 255, 255, 0.8)',
                                                    fontSize: { xs: '0.75rem', sm: '0.875rem' }
                                                }}>
                                                    {msg.text} <span style={{ fontSize: '0.7em', opacity: 0.7 }}>· {msg.time}</span>
                                                </Typography>
                                                {/* Audio player for voice messages */}
                                                {msg.audio && <audio controls src={msg.audio} style={{ marginTop: 6, maxWidth: '100%', height: 32 }} />}
                                                {/* Image display */}
                                                {msg.image && (
                                                    <img
                                                        src={msg.image}
                                                        alt="Shared"
                                                        style={{
                                                            marginTop: 8,
                                                            maxWidth: "100%",
                                                            width: '100%',
                                                            borderRadius: "8px",
                                                            display: 'block'
                                                        }}
                                                    />
                                                )}
                                                {/* Video display */}
                                                {msg.video && (
                                                    <video
                                                        controls
                                                        src={msg.video}
                                                        style={{
                                                            marginTop: 8,
                                                            maxWidth: "100%",
                                                            width: '100%',
                                                            borderRadius: "8px",
                                                            display: 'block'
                                                        }}
                                                    />
                                                )}
                                                {/* File download */}
                                                {msg.file && (
                                                    <a
                                                        href={msg.file}
                                                        download={msg.fileName || 'download'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-block',
                                                            marginTop: 6,
                                                            padding: '6px 10px',
                                                            background: 'rgba(33, 150, 243, 0.2)',
                                                            borderRadius: '6px',
                                                            color: '#fff',
                                                            textDecoration: 'none',
                                                            fontSize: window.innerWidth < 600 ? '11px' : '14px'
                                                        }}
                                                    >
                                                        📥 {window.innerWidth < 600 ? msg.fileName?.substring(0, 15) + '...' || 'File' : `Download ${msg.fileName || 'File'}`}
                                                    </a>
                                                )}

                                            </>
                                        }
                                    />
                                </ListItem>
                            </div>
                        </motion.div>
                    )
                })}
                {/* Show typing indicator */}
                {typing_user && (
                    <Typography sx={{ 
                        color: '#fff', 
                        fontStyle: 'italic', 
                        p: { xs: 0.5, sm: 1 },
                        fontSize: { xs: '0.7rem', sm: '0.875rem' }
                    }}>
                        {typing_user}
                    </Typography>
                )}
            </List>

            {/* Message Input */}
            <Box
                component="form"
                onSubmit={handleSend}
                sx={{
                    p: { xs: 1, sm: 2 },
                    display: 'flex',
                    gap: { xs: 0.5, sm: 1 },
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(5px)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                    flexWrap: 'nowrap',
                }}
            >
                {/* Message input field */}
                <TextField
                    placeholder="Type..."
                    value={newMessage}
                    onChange={(e) => {   
                        setNewMessage(e.target.value)
                        // Emit typing indicator to other users
                        socket?.emit("typing", `${user_name} is typing...`)
                    }}
                    fullWidth
                    variant="outlined"
                    size="small"
                    sx={{
                        minWidth: { xs: '100px', sm: 'auto' },
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                            '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                        },
                        '& .MuiInputBase-input': { color: '#fff', padding: { xs: '8px', sm: '10px 14px' } },
                    }}
                />
                {/* Image/Video preview with remove button */}
                {image && (
                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                        {fileType === 'video' ? (
                            <video
                                src={image}
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "8px",
                                    objectFit: "cover",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                    opacity: uploading ? 0.5 : 1,
                                }}
                            />
                        ) : (
                            <img
                                src={image}
                                alt="Preview"
                                style={{
                                    width: "50px",
                                    height: "50px",
                                    borderRadius: "8px",
                                    objectFit: "cover",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                    opacity: uploading ? 0.5 : 1,
                                }}
                            />
                        )}
                        {uploading && (
                            <Typography sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: 10 }}>
                                ...
                            </Typography>
                        )}
                        <IconButton
                            onClick={handleRemoveImage}
                            sx={{
                                position: 'absolute',
                                top: -8,
                                right: -8,
                                width: 24,
                                height: 24,
                                background: '#f44336',
                                color: '#fff',
                                '&:hover': { background: '#d32f2f' },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                )}
                {/* Voice recording button */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton
                        onClick={isRecording ? stopRecording : startRecording}
                        size="small"
                        sx={{
                            background: isRecording ? 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)' : 'linear-gradient(45deg, #4caf50 30%, #8bc34a 90%)',
                            color: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                            width: { xs: 32, sm: 40 },
                            height: { xs: 32, sm: 40 },
                        }}
                    >
                        {isRecording ? <StopIcon sx={{ fontSize: { xs: 16, sm: 24 } }} /> : <MicIcon sx={{ fontSize: { xs: 16, sm: 24 } }} />}
                    </IconButton>
                </motion.div>
                {/* File attachment button */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton
                        size="small"
                        sx={{
                            background: 'linear-gradient(45deg, #9c27b0 30%, #ba68c8 90%)',
                            color: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
                            width: { xs: 32, sm: 40 },
                            height: { xs: 32, sm: 40 },
                        }}
                    >
                        <AttachFileIcon onClick={() => fileInputRef.current.click()} sx={{ fontSize: { xs: 16, sm: 24 } }} />
                    </IconButton>
                </motion.div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleImageChange}
                />

                {/* Send message button */}

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton
                        type="submit"
                        color="primary"
                        size="small"
                        sx={{
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            color: '#fff',
                            borderRadius: '50%',
                            boxShadow: '0 2px 5px rgba(33, 150, 243, 0.3)',
                            width: { xs: 32, sm: 40 },
                            height: { xs: 32, sm: 40 },
                        }}
                    >
                        <SendIcon sx={{ fontSize: { xs: 16, sm: 24 } }} />
                    </IconButton>
                </motion.div>
            </Box>
        </Box>
    )
}
