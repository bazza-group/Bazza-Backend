import { Test, TestingModule } from '@nestjs/testing';
import { PlanosController } from './planos.controller';
import { PlanosService } from './planos.service';

describe('PlanosController', () => {
  let controller: PlanosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanosController],
      providers: [PlanosService],
    }).compile();

    controller = module.get<PlanosController>(PlanosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
