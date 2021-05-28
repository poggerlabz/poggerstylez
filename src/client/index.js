import theFunction from '../lib';
import { hashifyName } from 'poggerhashez/client';

export default (pragma) => theFunction(hashifyName, pragma);