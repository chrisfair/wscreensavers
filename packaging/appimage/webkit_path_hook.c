#define _GNU_SOURCE
#include <dlfcn.h>
#include <fcntl.h>
#include <limits.h>
#include <spawn.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

static const char *rewrite_webkit_path(const char *path, char *buf, size_t buflen) {
    if (!path) return path;
    const char *appdir = getenv("APPDIR");
    if (!appdir || !*appdir) return path;

    const char *p1 = "/usr/lib/x86_64-linux-gnu/webkit2gtk-4.1";
    const char *p2 = "/usr/lib/webkit2gtk-4.1";
    const char *p3 = "/usr/libexec/webkit2gtk-4.1";

    const char *rest = NULL;
    if (strncmp(path, p1, strlen(p1)) == 0) {
        rest = path + strlen(p1);
    } else if (strncmp(path, p2, strlen(p2)) == 0) {
        rest = path + strlen(p2);
    } else if (strncmp(path, p3, strlen(p3)) == 0) {
        rest = path + strlen(p3);
    }
    if (rest) {
        snprintf(buf, buflen, "%s/usr/lib/webkit2gtk-4.1%s", appdir, rest);
        return buf;
    }
    return path;
}

int execve(const char *pathname, char *const argv[], char *const envp[]) {
    static int (*real_execve)(const char *, char *const[], char *const[]) = NULL;
    if (!real_execve) real_execve = dlsym(RTLD_NEXT, "execve");
    char buf[PATH_MAX];
    return real_execve(rewrite_webkit_path(pathname, buf, sizeof(buf)), argv, envp);
}

int execv(const char *pathname, char *const argv[]) {
    static int (*real_execv)(const char *, char *const[]) = NULL;
    if (!real_execv) real_execv = dlsym(RTLD_NEXT, "execv");
    char buf[PATH_MAX];
    return real_execv(rewrite_webkit_path(pathname, buf, sizeof(buf)), argv);
}

int posix_spawn(pid_t *pid, const char *path,
                const posix_spawn_file_actions_t *file_actions,
                const posix_spawnattr_t *attrp,
                char *const argv[], char *const envp[]) {
    static int (*real_posix_spawn)(pid_t *, const char *,
                                   const posix_spawn_file_actions_t *,
                                   const posix_spawnattr_t *,
                                   char *const[], char *const[]) = NULL;
    if (!real_posix_spawn) real_posix_spawn = dlsym(RTLD_NEXT, "posix_spawn");
    char buf[PATH_MAX];
    return real_posix_spawn(pid, rewrite_webkit_path(path, buf, sizeof(buf)),
                            file_actions, attrp, argv, envp);
}

void *dlopen(const char *filename, int flags) {
    static void *(*real_dlopen)(const char *, int) = NULL;
    if (!real_dlopen) real_dlopen = dlsym(RTLD_NEXT, "dlopen");
    char buf[PATH_MAX];
    return real_dlopen(rewrite_webkit_path(filename, buf, sizeof(buf)), flags);
}

int access(const char *pathname, int mode) {
    static int (*real_access)(const char *, int) = NULL;
    if (!real_access) real_access = dlsym(RTLD_NEXT, "access");
    char buf[PATH_MAX];
    return real_access(rewrite_webkit_path(pathname, buf, sizeof(buf)), mode);
}

int stat(const char *pathname, struct stat *statbuf) {
    static int (*real_stat)(const char *, struct stat *) = NULL;
    if (!real_stat) real_stat = dlsym(RTLD_NEXT, "stat");
    char buf[PATH_MAX];
    return real_stat(rewrite_webkit_path(pathname, buf, sizeof(buf)), statbuf);
}

int lstat(const char *pathname, struct stat *statbuf) {
    static int (*real_lstat)(const char *, struct stat *) = NULL;
    if (!real_lstat) real_lstat = dlsym(RTLD_NEXT, "lstat");
    char buf[PATH_MAX];
    return real_lstat(rewrite_webkit_path(pathname, buf, sizeof(buf)), statbuf);
}

int open(const char *pathname, int flags, ...) {
    static int (*real_open)(const char *, int, ...) = NULL;
    if (!real_open) real_open = dlsym(RTLD_NEXT, "open");
    mode_t mode = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap;
        va_start(ap, flags);
        mode = va_arg(ap, mode_t);
        va_end(ap);
    }
    char buf[PATH_MAX];
    return real_open(rewrite_webkit_path(pathname, buf, sizeof(buf)), flags, mode);
}

int open64(const char *pathname, int flags, ...) {
    static int (*real_open64)(const char *, int, ...) = NULL;
    if (!real_open64) real_open64 = dlsym(RTLD_NEXT, "open64");
    mode_t mode = 0;
    if (flags & (O_CREAT | O_TMPFILE)) {
        va_list ap;
        va_start(ap, flags);
        mode = va_arg(ap, mode_t);
        va_end(ap);
    }
    char buf[PATH_MAX];
    return real_open64(rewrite_webkit_path(pathname, buf, sizeof(buf)), flags, mode);
}
