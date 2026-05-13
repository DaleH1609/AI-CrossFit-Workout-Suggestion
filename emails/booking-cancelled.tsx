import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components'

interface BookingCancelledProps {
  name: string
  date: string
  time: string
}

export function BookingCancelled({ name, date, time }: BookingCancelledProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Booking Cancelled</Heading>
          <Text style={text}>
            Hi {name}, your booking for <strong>{date}</strong> at <strong>{time}</strong> has been cancelled.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#0A0A0A', fontFamily: 'Inter, sans-serif' }
const container = { maxWidth: '500px', padding: '32px', color: '#ffffff' }
const heading = { color: '#D4AF37', fontFamily: 'Georgia, serif', marginTop: 0 }
const text = { color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }
