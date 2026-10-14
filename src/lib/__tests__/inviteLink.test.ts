import { parseInviteUrl } from '../inviteLink';

describe('parseInviteUrl', () => {
  it('parses a tenancyId and token', () => {
    expect(parseInviteUrl('unithub://invite?tenancyId=t1&token=tok123')).toEqual({
      tenancyId: 't1',
      inviteToken: 'tok123',
    });
  });

  it('parses a tenancyId with no token (fresh-tenancy claim path)', () => {
    expect(parseInviteUrl('unithub://invite?tenancyId=t1')).toEqual({ tenancyId: 't1' });
  });

  it('decodes percent-encoded values', () => {
    expect(parseInviteUrl('unithub://invite?tenancyId=t1&token=a%2Fb%3Dc')).toEqual({
      tenancyId: 't1',
      inviteToken: 'a/b=c',
    });
  });

  it('rejects a URL missing tenancyId', () => {
    expect(parseInviteUrl('unithub://invite?token=tok123')).toBeNull();
  });

  it('rejects an unrelated scheme or host', () => {
    expect(parseInviteUrl('https://example.com/invite?tenancyId=t1')).toBeNull();
    expect(parseInviteUrl('unithub://other?tenancyId=t1')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(parseInviteUrl('not a url')).toBeNull();
  });
});
