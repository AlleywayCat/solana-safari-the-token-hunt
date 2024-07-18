import { TokenDto } from './token.dto';

export class TokenResponseDto {
  tokens: TokenDto[];
  totalValue: string;
}
