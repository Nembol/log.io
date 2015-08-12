#!/bin/sh
basedir=`dirname "$0"`

case `uname` in
    *CYGWIN*) basedir=`cygpath -w "$basedir"`;;
esac

if [ -x "$basedir/node" ]; then
  "$basedir/node"  "$basedir/../log.io/bin/log.io-server" "$@"
  ret=$?
else 
  node  "$basedir/../log.io/bin/log.io-server" "$@"
  ret=$?
fi
exit $ret
