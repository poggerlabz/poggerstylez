import theFunction from '../lib';
import { hashifyName } from 'poggerhashez/server';

export default (pragma) => theFunction(hashifyName, pragma);