import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const [dbHealth, redisHealth] = await Promise.all([
      this.db.healthCheck(),
      this.redis.healthCheck(),
    ]);

    const isHealthy = dbHealth && redisHealth;
    const mem = process.memoryUsage();

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      services: {
        database: dbHealth ? 'connected' : 'disconnected',
        redis: redisHealth ? 'connected' : 'disconnected',
        storage: 'connected',
      },
      system: {
        memoryUsageMB: {
          rss: Math.round(mem.rss / 1024 / 1024),
          heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
          external: Math.round(mem.external / 1024 / 1024),
        },
        nodeVersion: process.version,
        pid: process.pid,
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  async live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    const [dbHealth, redisHealth] = await Promise.all([
      this.db.healthCheck(),
      this.redis.healthCheck(),
    ]);

    if (!dbHealth || !redisHealth) {
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        redis: redisHealth,
      };
    }

    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
