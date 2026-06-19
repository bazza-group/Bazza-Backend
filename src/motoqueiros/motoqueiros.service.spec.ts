import { Test, TestingModule } from '@nestjs/testing';
import { MotoqueirosService } from './motoqueiros.service';

describe('MotoqueirosService', () => {
  let service: MotoqueirosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MotoqueirosService],
    }).compile();

    service = module.get<MotoqueirosService>(MotoqueirosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
