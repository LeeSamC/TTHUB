const request = require('supertest')
const app = require('../server')
const { describe } = require('zod/v4/core')

describe('Authentication API', () => {
    let cookies = []

    test('Register new user', async () => {
        const testUsername = `testuser_${Date.now()}`

        const res = await request(app).post('/api/auth/register').send({
            firstName: 'Test',
            lastName: 'User',
            username: testUsername,
            password: 'TestPass123',
        }).expect(201)

        expect(res.body.user).toHaveProperty('username', testUsername);
        expect(res.body.user).not.toHaveProperty('password')

    })

    test('Login user', async () => {
        const res = await request(app).post('/api/auth/login').send({
            username: 'LeeSam',
            password: 'Alphafire101'
        }).expect(200)

        cookies = res.headers['set-cookie'];
        expect(res.body.message).toBe('Login successful')
    })
})

describe('Post API', () => {
    let cookies = []

    test('Add new post', async ()=> {
        const res = (await request(app).post('/api/posts')).setEncoding({
            content: 'Test Content'
        }).expect(201)

        cookies = res.headers['set-cookie'];
        expect(res.body.message).toHaveProperty('content', content)
    })
})