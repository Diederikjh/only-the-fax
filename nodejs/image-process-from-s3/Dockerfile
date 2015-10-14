# Docker file for faxit2me's image processing component.
FROM debian:jessie
MAINTAINER Diederik Hattingh <diederikjhattingh@gmail.com>
# tesseract ocr
RUN apt-get update && apt-get install -y tesseract-ocr \
    git \
    curl

# Install bulk of node's dependencies because the internet is broken!: (bad mirrors...)
RUN apt-get install -y binutils build-essential bzip2 ca-certificates cpp cpp-4.9 dpkg-dev fakeroot \
  file g++ g++-4.9 gcc gcc-4.9 gyp javascript-common libalgorithm-c3-perl \
  libalgorithm-diff-perl libalgorithm-diff-xs-perl libalgorithm-merge-perl \
  libarchive-extract-perl libasan1 libatomic1 libc-ares-dev libc-ares2 \
  libc-dev-bin libc6-dev libcgi-fast-perl libcgi-pm-perl libcilkrts5 \
  libclass-c3-perl libclass-c3-xs-perl libcloog-isl4 libcpan-meta-perl \
  libdata-optlist-perl libdata-section-perl libdpkg-perl libexpat1 libfakeroot \
  libfcgi-perl libffi6 libfile-fcntllock-perl libgcc-4.9-dev libgdbm3 libgmp10 \
  libgomp1 libisl10 libitm1 libjs-jquery libjs-node-uuid libjs-underscore


RUN apt-get install -y liblog-message-perl liblog-message-simple-perl liblsan0 libmagic1 \
  libmodule-build-perl libmodule-pluggable-perl libmodule-signature-perl \
  libmpc3 libmpfr4 libmro-compat-perl libpackage-constants-perl \
  libparams-util-perl libpod-latex-perl libpod-readme-perl libpython-stdlib \
  libpython2.7-minimal libpython2.7-stdlib libquadmath0 libregexp-common-perl \
  libsoftware-license-perl libsqlite3-0 libssl-dev libssl-doc libssl1.0.0 \
  libstdc++-4.9-dev libsub-exporter-perl libsub-install-perl libterm-ui-perl \
  libtext-soundex-perl libtext-template-perl libtimedate-perl libtsan0 \
  libubsan0 libv8-3.14-dev libv8-3.14.5 linux-libc-dev make manpages \
  manpages-dev mime-support openssl \
  patch perl perl-modules python python-minimal python-pkg-resources python2.7 \
  python2.7-minimal rename xz-utils zlib1g-dev

# Node js as per https://nodesource.com/blog/nodejs-v012-iojs-and-the-nodesource-linux-repositories
RUN curl -sL https://deb.nodesource.com/setup_0.12 | bash - 
RUN apt-get install -y nodejs 

#RUN apt-get curl
#RUN curl -sL https://deb.nodesource.com/setup | bash -

# Get repo
RUN mkdir /src && \
    cd /src && \
    git init && \
    git clone https://github.com/Diederikjh/only-the-fax.git && \
    cd /src/only-the-fax/nodejs/image-process-from-s3 && \
    npm install /src/only-the-fax/nodejs/image-process-from-s3

ENTRYPOINT ["/usr/bin/nodejs", "/src/only-the-fax/nodejs/image-process-from-s3"]

EXPOSE 8080