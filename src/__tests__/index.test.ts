import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from '../index.js';

describe('Social Scheduler Plugin', () => {
  let mockApi: any;
  let registeredCli: any;
  let registeredTool: any;
  let registeredMethods: Map<string, any>;

  beforeEach(() => {
    registeredMethods = new Map();
    
    mockApi = {
      registerCli: vi.fn((fn, options) => {
        registeredCli = { fn, options };
      }),
      registerTool: vi.fn((tool) => {
        registeredTool = tool;
      }),
      registerGatewayMethod: vi.fn((name, handler) => {
        registeredMethods.set(name, handler);
      }),
    };
  });

  describe('Plugin Registration', () => {
    it('should register CLI commands', () => {
      plugin(mockApi);
      
      expect(mockApi.registerCli).toHaveBeenCalled();
      expect(registeredCli.options.commands).toEqual(['social']);
    });

    it('should register tool', () => {
      plugin(mockApi);
      
      expect(mockApi.registerTool).toHaveBeenCalled();
      expect(registeredTool.name).toBe('social_scheduler');
      expect(registeredTool.input_schema.properties.action.enum).toEqual([
        'draft',
        'schedule',
        'publish',
        'list',
        'upcoming',
        'cancel',
        'delete',
      ]);
    });

    it('should register gateway methods', () => {
      plugin(mockApi);
      
      expect(mockApi.registerGatewayMethod).toHaveBeenCalledTimes(4);
      expect(registeredMethods.has('social.draft')).toBe(true);
      expect(registeredMethods.has('social.schedule')).toBe(true);
      expect(registeredMethods.has('social.list')).toBe(true);
      expect(registeredMethods.has('social.upcoming')).toBe(true);
    });
  });

  describe('Tool Handler - Validation', () => {
    beforeEach(() => {
      plugin(mockApi);
    });

    it('should validate content for draft action', async () => {
      const respond = vi.fn();
      
      await registeredTool.handler(
        { action: 'draft' },
        { respond }
      );
      
      expect(respond).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          ok: false,
          error: expect.stringContaining('Content is required'),
        })
      );
    });

    it('should validate ID for schedule action', async () => {
      const respond = vi.fn();
      
      await registeredTool.handler(
        { action: 'schedule' },
        { respond }
      );
      
      expect(respond).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          ok: false,
          error: expect.stringContaining('Post ID is required'),
        })
      );
    });

    it('should validate date for schedule action', async () => {
      const respond = vi.fn();
      
      await registeredTool.handler(
        { action: 'schedule', id: '1' },
        { respond }
      );
      
      expect(respond).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          ok: false,
          error: expect.stringContaining('Date is required'),
        })
      );
    });

    it('should validate ID for publish action', async () => {
      const respond = vi.fn();
      
      await registeredTool.handler(
        { action: 'publish' },
        { respond }
      );
      
      expect(respond).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          ok: false,
          error: expect.stringContaining('Post ID is required'),
        })
      );
    });

    it('should validate ID for cancel action', async () => {
      const respond = vi.fn();
      
      await registeredTool.handler(
        { action: 'cancel' },
        { respond }
      );
      
      expect(respond).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          ok: false,
          error: expect.stringContaining('Post ID is required'),
        })
      );
    });

    it('should validate ID for delete action', async () => {
      const respond = vi.fn();
      
      await registeredTool.handler(
        { action: 'delete' },
        { respond }
      );
      
      expect(respond).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          ok: false,
          error: expect.stringContaining('Post ID is required'),
        })
      );
    });

    it('should reject unknown actions', async () => {
      const respond = vi.fn();
      
      await registeredTool.handler(
        { action: 'invalid' },
        { respond }
      );
      
      expect(respond).toHaveBeenCalledWith(
        false,
        expect.objectContaining({
          ok: false,
          error: expect.stringContaining('Unknown action'),
        })
      );
    });
  });

  describe('Input Schema', () => {
    beforeEach(() => {
      plugin(mockApi);
    });

    it('should have correct action enum', () => {
      expect(registeredTool.input_schema.properties.action.enum).toEqual([
        'draft',
        'schedule',
        'publish',
        'list',
        'upcoming',
        'cancel',
        'delete',
      ]);
    });

    it('should have platforms array', () => {
      expect(registeredTool.input_schema.properties.platforms).toBeDefined();
      expect(registeredTool.input_schema.properties.platforms.type).toBe('array');
      expect(registeredTool.input_schema.properties.platforms.items.enum).toEqual([
        'twitter',
        'linkedin',
        'mastodon',
        'bluesky',
      ]);
    });

    it('should have content parameter', () => {
      expect(registeredTool.input_schema.properties.content).toBeDefined();
      expect(registeredTool.input_schema.properties.content.type).toBe('string');
    });

    it('should have date parameter', () => {
      expect(registeredTool.input_schema.properties.date).toBeDefined();
      expect(registeredTool.input_schema.properties.date.type).toBe('string');
    });

    it('should have status parameter with correct enum', () => {
      expect(registeredTool.input_schema.properties.status).toBeDefined();
      expect(registeredTool.input_schema.properties.status.enum).toEqual([
        'draft',
        'scheduled',
        'published',
      ]);
    });

    it('should have campaign parameter', () => {
      expect(registeredTool.input_schema.properties.campaign).toBeDefined();
      expect(registeredTool.input_schema.properties.campaign.type).toBe('string');
    });

    it('should require only action parameter', () => {
      expect(registeredTool.input_schema.required).toEqual(['action']);
    });
  });

  describe('Tool Description', () => {
    beforeEach(() => {
      plugin(mockApi);
    });

    it('should have comprehensive description', () => {
      expect(registeredTool.description).toContain('social media');
      expect(registeredTool.description).toContain('multiple platforms');
    });
  });
});
