import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components'

interface BookingConfirmedProps {
  name: string
  date: string
  time: string
}

export function BookingConfirmed({ name, date, time }: BookingConfirmedProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Booking Confirmed</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Your spot is confirmed for <strong>{date}</strong> at <strong>{time}</strong>.
          </Text>
          <Text style={muted}>Cancel up to 1 hour before class.</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#0B0B0C', fontFamily: 'Inter, sans-serif' }
const container = { maxWidth: '500px', padding: '32px', color: '#ffffff' }
const heading = { color: '#C6F24E', fontFamily: 'Georgia, serif', marginTop: 0 }
const text = { color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }
const muted = { color: '#9CA3AF', fontSize: '12px' }
