import { Test, TestingModule } from '@nestjs/testing';
import { CarteiraController } from './carteira.controller';
import { CarteiraService } from './carteira.service';

describe('CarteiraController', () => {
  let controller: CarteiraController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarteiraController],
      providers: [CarteiraService],
    }).compile();

    controller = module.get<CarteiraController>(CarteiraController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
