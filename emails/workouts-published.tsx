import * as React from 'react'
import { Html, Head, Body, Container, Heading, Text } from '@react-email/components'

interface WorkoutsPublishedProps {
  gymName: string
}

export function WorkoutsPublished({ gymName }: WorkoutsPublishedProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>This Week&apos;s Workouts Are Live</Heading>
          <Text style={text}>
            {gymName} has published the workouts for this week. Log in to view and book your classes.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#0B0B0C', fontFamily: 'Inter, sans-serif' }
const container = { maxWidth: '500px', padding: '32px', color: '#ffffff' }
const heading = { color: '#C6F24E', fontFamily: 'Georgia, serif', marginTop: 0 }
const text = { color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }
