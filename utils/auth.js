import redisClient from './redis';

export default async function auth(request) {
  const token = request.header('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  return userId;
}
