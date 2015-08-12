#!/bin/sh
basedir=`dirname "$0"`

case `uname` in
    *CYGWIN*) basedir=`cygpath -w "$basedir"`;;
esac

if [ -x "$basedir/node" ]; then
  "$basedir/node"  "$basedir/../log.io/bin/log.io-harvester" "$@"
  ret=$?
else 
  node  "$basedir/../log.io/bin/log.io-harvester" "$@"
  ret=$?
fi
exit $ret
