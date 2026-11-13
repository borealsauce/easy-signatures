import test from 'node:test'
import assert from 'node:assert/strict'
import { initialsOf } from '../shared/names.js'

test('initials use every name part, so a middle name makes three letters', () => {
  assert.equal(initialsOf('Mary Anne Jones'), 'MAJ')
  assert.equal(initialsOf('John Smith'), 'JS')
  assert.equal(initialsOf('Madonna'), 'M')
  assert.equal(initialsOf('John Smith Jr.'), 'JS')
  assert.equal(initialsOf('Ana Maria Lopez'), 'AML')
  assert.equal(initialsOf('  mary-anne   jones '), 'MJ')
})
