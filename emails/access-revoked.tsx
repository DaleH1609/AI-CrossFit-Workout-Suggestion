import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components'

interface AccessRevokedProps {
  name: string
}

export function AccessRevoked({ name }: AccessRevokedProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Access Removed</Heading>
          <Text style={text}>
            Hi {name}, your access to the gym has been removed and your upcoming bookings have been cancelled.
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
