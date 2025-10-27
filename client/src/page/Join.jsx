"use client"

import React from "react"
import { Button, Card, CardContent, CardHeader, TextField, Typography, Box, Avatar, useTheme } from "@mui/material"
import { Link as RouterLink } from "react-router-dom"
import { motion } from "framer-motion"

export default function Join() {
    const [name, setName] = React.useState("")
    const theme = useTheme()

    return (
        <Box
            display="grid"
            minHeight="100dvh"
            alignItems="center"
            sx={{
                px: 2,
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
            <Box maxWidth={420} mx="auto" width="100%">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <Card
                        elevation={10}
                        sx={{
                            borderRadius: 4, // More rounded corners
                            background: 'rgba(255, 255, 255, 0.95)', // Semi-transparent for glassmorphism effect
                            backdropFilter: 'blur(10px)', // Blur for extraordinary glassmorphism
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)', // Deeper shadow
                            overflow: 'hidden',
                        }}
                    >
                        <CardHeader
                            title={<Typography variant="h5" sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>Join Fabulous  Chat</Typography>}
                            subheader={
                                <Typography variant="body2" color="text.secondary">
                                    Enter your display name to embark on an extraordinary chat journey.
                                </Typography>
                            }
                            avatar={
                                <Avatar sx={{ bgcolor: theme.palette.secondary.main, animation: 'pulse 2s infinite' }}>
                                    🌟
                                </Avatar>
                            } // Added avatar for flair
                            sx={{ pb: 1 }}
                        />

                        <CardContent>
                            <Box
                                component="form"
                                onSubmit={(e) => {
                                    e.preventDefault()
                                }}
                                sx={{ display: "flex", flexDirection: "column", gap: 3 }} // Increased gap for better spacing
                            >
                                <TextField
                                    id="name"
                                    label="Your Name"
                                    placeholder="e.g. Casey"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    size="medium"
                                    fullWidth
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                boxShadow: '0 0 10px rgba(33, 150, 243, 0.5)', // Glow on hover
                                            },
                                            '&.Mui-focused': {
                                                boxShadow: '0 0 15px rgba(33, 150, 243, 0.7)',
                                            },
                                        },
                                    }}
                                />

                                {/* Join as React Router Link */}
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        size="large"
                                        variant="contained"
                                        color="primary"
                                        component={RouterLink}
                                        to={`/chat/${name}`}
                                        disabled={!name}
                                        fullWidth
                                        sx={{
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 'bold',
                                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', // Gradient button
                                            boxShadow: '0 3px 5px 2px rgba(33, 150, 243, 0.3)',
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                background: 'linear-gradient(45deg, #21CBF3 30%, #2196F3 90%)',
                                                boxShadow: '0 5px 10px 3px rgba(33, 150, 243, 0.5)',
                                            },
                                        }}
                                    >
                                        Join the Adventure
                                    </Button>
                                </motion.div>

                                <Typography variant="caption" color="text.secondary" align="center">
                                    Join the Fabulous Chat and embark on a journey of endless possibilities.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>
            </Box>
        </Box>
    )
}