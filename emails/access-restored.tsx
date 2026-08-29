import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text, Button } from '@react-email/components'

interface AccessRestoredProps {
  name: string
  gymName: string
  loginUrl: string
}

export function AccessRestored({ name, gymName, loginUrl }: AccessRestoredProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Access Restored</Heading>
          <Text style={text}>
            Hi {name}, your access to <strong>{gymName}</strong> has been restored.
          </Text>
          <Button href={loginUrl} style={button}>Log In</Button>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#0B0B0C', fontFamily: 'Inter, sans-serif' }
const container = { maxWidth: '500px', padding: '32px', color: '#ffffff' }
const heading = { color: '#C6F24E', fontFamily: 'Georgia, serif', marginTop: 0 }
const text = { color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }
const button = {
  display: 'inline-block', marginTop: '16px', padding: '12px 24px',
  backgroundColor: '#C6F24E', color: '#000000', textDecoration: 'none',
  borderRadius: '4px', fontWeight: '600', fontSize: '14px',
}
