import { Parser } from '@oclif/core';
import { expect, test } from 'vitest';
import { filterFactory } from './filter.js';

describe('filter flag', () => {
  test('parses string filters', async () => {
    const { flags: { filter: result } } = await Parser.parse(['--filter', 'name=John'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result).toEqual({
      key: 'name',
      operator: '=',
      value: 'John',
    });

    const { flags: { filter: result2 } } = await Parser.parse(['--filter', 'name!=John'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result2).toEqual({
      key: 'name',
      operator: '!=',
      value: 'John',
    });

    const { flags: { filter: result3 } } = await Parser.parse(['--filter', 'name~John'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result3).toEqual({
      key: 'name',
      operator: '~',
      value: 'John',
    });

    const { flags: { filter: result4 } } = await Parser.parse(['--filter', 'name!~John'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result4).toEqual({
      key: 'name',
      operator: '!~',
      value: 'John',
    });

    const { flags: { filter: result5 } } = await Parser.parse(['--filter', 'name^~John'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result5).toEqual({
      key: 'name',
      operator: '^~',
      value: 'John',
    });

    const { flags: { filter: result6 } } = await Parser.parse(['--filter', 'name$~John'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result6).toEqual({
      key: 'name',
      operator: '$~',
      value: 'John',
    });
  });

  test('parses number filters', async () => {
    const { flags: { filter: result } } = await Parser.parse(['--filter', 'age=25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result).toEqual({
      key: 'age',
      operator: '=',
      value: 25,
    });

    const { flags: { filter: result2 } } = await Parser.parse(['--filter', 'age!=25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result2).toEqual({
      key: 'age',
      operator: '!=',
      value: 25,
    });

    const { flags: { filter: result3 } } = await Parser.parse(['--filter', 'age<25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result3).toEqual({
      key: 'age',
      operator: '<',
      value: 25,
    });

    const { flags: { filter: result4 } } = await Parser.parse(['--filter', 'age<=25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result4).toEqual({
      key: 'age',
      operator: '<=',
      value: 25,
    });

    const { flags: { filter: result5 } } = await Parser.parse(['--filter', 'age>25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result5).toEqual({
      key: 'age',
      operator: '>',
      value: 25,
    });

    const { flags: { filter: result6 } } = await Parser.parse(['--filter', 'age>=25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result6).toEqual({
      key: 'age',
      operator: '>=',
      value: 25,
    });
  });

  test('parses date filters', async () => {
    const { flags: { filter: result } } = await Parser.parse(
      ['--filter', 'created_at=2024-03-20'],
      {
        flags: {
          filter: filterFactory()(),
        },
      },
    );
    expect(result).toEqual({
      key: 'created_at',
      operator: '=',
      value: new Date('2024-03-20'),
    });

    const { flags: { filter: result2 } } = await Parser.parse(['--filter',
      'created_at!=2024-03-20'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result2).toEqual({
      key: 'created_at',
      operator: '!=',
      value: new Date('2024-03-20'),
    });

    const { flags: { filter: result3 } } = await Parser.parse(
      ['--filter', 'created_at<2024-03-20'],
      {
        flags: {
          filter: filterFactory()(),
        },
      },
    );
    expect(result3).toEqual({
      key: 'created_at',
      operator: '<',
      value: new Date('2024-03-20'),
    });

    const { flags: { filter: result4 } } = await Parser.parse(['--filter',
      'created_at<=2024-03-20'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result4).toEqual({
      key: 'created_at',
      operator: '<=',
      value: new Date('2024-03-20'),
    });

    const { flags: { filter: result5 } } = await Parser.parse(
      ['--filter', 'created_at>2024-03-20'],
      {
        flags: {
          filter: filterFactory()(),
        },
      },
    );
    expect(result5).toEqual({
      key: 'created_at',
      operator: '>',
      value: new Date('2024-03-20'),
    });

    const { flags: { filter: result6 } } = await Parser.parse(['--filter',
      'created_at>=2024-03-20'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result6).toEqual({
      key: 'created_at',
      operator: '>=',
      value: new Date('2024-03-20'),
    });
  });

  test('parses boolean filters', async () => {
    const { flags: { filter: result } } = await Parser.parse(['--filter', 'is_active=true'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result).toEqual({
      key: 'is_active',
      operator: 'is',
      value: true,
    });

    const { flags: { filter: result2 } } = await Parser.parse(['--filter', 'is_active=false'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result2).toEqual({
      key: 'is_active',
      operator: 'is',
      value: false,
    });

    const { flags: { filter: result3 } } = await Parser.parse(['--filter', 'is_active=!true'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result3).toEqual({
      key: 'is_active',
      operator: 'is not',
      value: true,
    });

    const { flags: { filter: result4 } } = await Parser.parse(['--filter', 'is_active=!false'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result4).toEqual({
      key: 'is_active',
      operator: 'is not',
      value: false,
    });
  });

  test('parses null filters', async () => {
    const { flags: { filter: result } } = await Parser.parse(['--filter', 'deleted_at=null'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result).toEqual({
      key: 'deleted_at',
      operator: 'is',
      value: null,
    });

    const { flags: { filter: result2 } } = await Parser.parse(['--filter', 'deleted_at!=null'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result2).toEqual({
      key: 'deleted_at',
      operator: 'is not',
      value: null,
    });
  });

  test('parses list filters', async () => {
    const { flags: { filter: result } } = await Parser.parse(['--filter',
      'status=in(active,pending)'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result).toEqual({
      key: 'status',
      operator: 'in',
      value: ['active', 'pending'],
    });

    const { flags: { filter: result2 } } = await Parser.parse(['--filter',
      'status=not in(active,pending)'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result2).toEqual({
      key: 'status',
      operator: 'not in',
      value: ['active', 'pending'],
    });
  });

  test('handles quoted string values', async () => {
    const { flags: { filter: result } } = await Parser.parse(['--filter', 'name="John Doe"'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result).toEqual({
      key: 'name',
      operator: '=',
      value: 'John Doe',
    });
  });

  test('handles alternative operator syntaxes', async () => {
    const { flags: { filter: result } } = await Parser.parse(['--filter', 'age=eq25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result).toEqual({
      key: 'age',
      operator: '=',
      value: 25,
    });

    const { flags: { filter: result2 } } = await Parser.parse(['--filter', 'age=gt25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result2).toEqual({
      key: 'age',
      operator: '>',
      value: 25,
    });

    const { flags: { filter: result3 } } = await Parser.parse(['--filter', 'age=gte25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result3).toEqual({
      key: 'age',
      operator: '>=',
      value: 25,
    });

    const { flags: { filter: result4 } } = await Parser.parse(['--filter', 'age=lt25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result4).toEqual({
      key: 'age',
      operator: '<',
      value: 25,
    });

    const { flags: { filter: result5 } } = await Parser.parse(['--filter', 'age=lte25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result5).toEqual({
      key: 'age',
      operator: '<=',
      value: 25,
    });

    const { flags: { filter: result6 } } = await Parser.parse(['--filter', 'age=ne25'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result6).toEqual({
      key: 'age',
      operator: '!=',
      value: 25,
    });

    const { flags: { filter: result7 } } = await Parser.parse(['--filter', 'name=likeJohn'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result7).toEqual({
      key: 'name',
      operator: '~',
      value: 'John',
    });

    const { flags: { filter: result8 } } = await Parser.parse(['--filter', 'name=not likeJohn'], {
      flags: {
        filter: filterFactory()(),
      },
    });
    expect(result8).toEqual({
      key: 'name',
      operator: '!~',
      value: 'John',
    });
  });
});
