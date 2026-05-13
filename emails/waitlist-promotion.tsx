import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text, Button } from '@react-email/components'

interface WaitlistPromotionProps {
  name: string
  date: string
  time: string
  confirmUrl: string
  expiresIn: string
}

export function WaitlistPromotion({ name, date, time, confirmUrl, expiresIn }: WaitlistPromotionProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Spot Available</Heading>
          <Text style={text}>
            Hi {name}, a spot opened for <strong>{date}</strong> at <strong>{time}</strong>.
          </Text>
          <Text style={text}>Confirm within <strong>{expiresIn}</strong>:</Text>
          <Button href={confirmUrl} style={button}>Confirm My Spot</Button>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#0A0A0A', fontFamily: 'Inter, sans-serif' }
const container = { maxWidth: '500px', padding: '32px', color: '#ffffff' }
const heading = { color: '#D4AF37', fontFamily: 'Georgia, serif', marginTop: 0 }
const text = { color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }
const button = {
  display: 'inline-block', marginTop: '16px', padding: '12px 24px',
  backgroundColor: '#D4AF37', color: '#000000', textDecoration: 'none',
  borderRadius: '4px', fontWeight: '600', fontSize: '14px',
}
