// Aracı denemek için örnek kayıt. Gerçek bir sunucudan alınmadı; elle yazıldı.
// Senaryo: 203.0.113.9 adresinden kullanıcı adı taraması, 198.51.100.7 adresinden
// parola denemesi ve sonunda tutan bir giriş, 192.0.2.44 ise parolasını yanlış
// yazıp ikinci denemede giren normal bir kullanıcı.

export const ORNEK_LOG = `Sep 13 03:11:02 sunucu sshd[2001]: Accepted publickey for arda from 192.0.2.10 port 49122 ssh2
Sep 13 04:22:14 sunucu sshd[2110]: Failed password for arda from 192.0.2.44 port 51004 ssh2
Sep 13 04:22:31 sunucu sshd[2110]: Accepted password for arda from 192.0.2.44 port 51004 ssh2
Sep 13 05:02:08 sunucu sshd[2415]: Invalid user admin from 203.0.113.9
Sep 13 05:02:08 sunucu sshd[2415]: Failed password for invalid user admin from 203.0.113.9 port 40122 ssh2
Sep 13 05:02:09 sunucu sshd[2416]: Invalid user test from 203.0.113.9
Sep 13 05:02:09 sunucu sshd[2416]: Failed password for invalid user test from 203.0.113.9 port 40124 ssh2
Sep 13 05:02:10 sunucu sshd[2417]: Invalid user oracle from 203.0.113.9
Sep 13 05:02:10 sunucu sshd[2417]: Failed password for invalid user oracle from 203.0.113.9 port 40126 ssh2
Sep 13 05:02:11 sunucu sshd[2418]: Invalid user postgres from 203.0.113.9
Sep 13 05:02:11 sunucu sshd[2418]: Failed password for invalid user postgres from 203.0.113.9 port 40128 ssh2
Sep 13 05:02:12 sunucu sshd[2419]: Invalid user ubuntu from 203.0.113.9
Sep 13 05:02:12 sunucu sshd[2419]: Failed password for invalid user ubuntu from 203.0.113.9 port 40130 ssh2
Sep 13 05:02:13 sunucu sshd[2420]: Invalid user git from 203.0.113.9
Sep 13 05:02:13 sunucu sshd[2420]: Failed password for invalid user git from 203.0.113.9 port 40132 ssh2
Sep 13 05:02:14 sunucu sshd[2421]: Invalid user jenkins from 203.0.113.9
Sep 13 05:02:14 sunucu sshd[2421]: Failed password for invalid user jenkins from 203.0.113.9 port 40134 ssh2
Sep 13 05:02:15 sunucu sshd[2422]: Invalid user deploy from 203.0.113.9
Sep 13 05:02:15 sunucu sshd[2422]: Failed password for invalid user deploy from 203.0.113.9 port 40136 ssh2
Sep 13 05:02:16 sunucu sshd[2423]: Invalid user ftpuser from 203.0.113.9
Sep 13 05:02:16 sunucu sshd[2423]: Failed password for invalid user ftpuser from 203.0.113.9 port 40138 ssh2
Sep 13 05:02:17 sunucu sshd[2424]: Invalid user mysql from 203.0.113.9
Sep 13 05:02:17 sunucu sshd[2424]: Failed password for invalid user mysql from 203.0.113.9 port 40140 ssh2
Sep 13 05:02:18 sunucu sshd[2425]: Invalid user nagios from 203.0.113.9
Sep 13 05:02:18 sunucu sshd[2425]: Failed password for invalid user nagios from 203.0.113.9 port 40142 ssh2
Sep 13 05:02:19 sunucu sshd[2426]: Invalid user backup from 203.0.113.9
Sep 13 05:02:19 sunucu sshd[2426]: Failed password for invalid user backup from 203.0.113.9 port 40144 ssh2
Sep 13 09:14:51 sunucu sshd[3120]: Accepted publickey for arda from 192.0.2.10 port 49188 ssh2
Sep 13 22:41:03 sunucu sshd[4501]: Failed password for root from 198.51.100.7 port 33012 ssh2
Sep 13 22:41:19 sunucu sshd[4502]: Failed password for root from 198.51.100.7 port 33018 ssh2
Sep 13 22:41:35 sunucu sshd[4503]: Failed password for root from 198.51.100.7 port 33024 ssh2
Sep 13 22:41:52 sunucu sshd[4504]: Failed password for root from 198.51.100.7 port 33030 ssh2
Sep 13 22:42:08 sunucu sshd[4505]: Failed password for root from 198.51.100.7 port 33036 ssh2
Sep 13 22:42:24 sunucu sshd[4506]: Failed password for root from 198.51.100.7 port 33042 ssh2
Sep 13 22:42:41 sunucu sshd[4507]: Failed password for root from 198.51.100.7 port 33048 ssh2
Sep 13 22:42:57 sunucu sshd[4508]: Failed password for root from 198.51.100.7 port 33054 ssh2
Sep 13 22:43:13 sunucu sshd[4509]: Failed password for root from 198.51.100.7 port 33060 ssh2
Sep 13 22:43:30 sunucu sshd[4510]: Failed password for root from 198.51.100.7 port 33066 ssh2
Sep 13 22:43:46 sunucu sshd[4511]: Failed password for root from 198.51.100.7 port 33072 ssh2
Sep 13 22:44:02 sunucu sshd[4512]: Failed password for root from 198.51.100.7 port 33078 ssh2
Sep 13 22:44:18 sunucu sshd[4513]: Accepted password for root from 198.51.100.7 port 33084 ssh2
Sep 13 23:05:44 sunucu sshd[4600]: Accepted publickey for arda from 192.0.2.10 port 49250 ssh2`;
