import { Test, TestingModule } from '@nestjs/testing';
import { MotoqueirosController } from './motoqueiros.controller';
import { MotoqueirosService } from './motoqueiros.service';

describe('MotoqueirosController', () => {
  let controller: MotoqueirosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MotoqueirosController],
      providers: [MotoqueirosService],
    }).compile();

    controller = module.get<MotoqueirosController>(MotoqueirosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
