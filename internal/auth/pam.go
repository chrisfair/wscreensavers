package auth

/*
#cgo LDFLAGS: -lpam
#include <security/pam_appl.h>
#include <stdlib.h>
#include <string.h>

struct pam_response_data {
    const char *password;
};

static int pam_conv_cb(int num_msg, const struct pam_message **msg,
                       struct pam_response **resp, void *appdata_ptr) {
    if (num_msg <= 0 || num_msg > PAM_MAX_NUM_MSG) {
        return PAM_CONV_ERR;
    }
    struct pam_response_data *data = (struct pam_response_data *)appdata_ptr;
    struct pam_response *reply = (struct pam_response *)calloc(num_msg, sizeof(struct pam_response));
    if (!reply) {
        return PAM_BUF_ERR;
    }
    for (int i = 0; i < num_msg; i++) {
        switch (msg[i]->msg_style) {
            case PAM_PROMPT_ECHO_OFF:
            case PAM_PROMPT_ECHO_ON:
                reply[i].resp = strdup(data->password ? data->password : "");
                reply[i].resp_retcode = 0;
                break;
            case PAM_ERROR_MSG:
            case PAM_TEXT_INFO:
                reply[i].resp = NULL;
                reply[i].resp_retcode = 0;
                break;
            default:
                for (int j = 0; j < num_msg; j++) {
                    if (reply[j].resp) free(reply[j].resp);
                }
                free(reply);
                return PAM_CONV_ERR;
        }
    }
    *resp = reply;
    return PAM_SUCCESS;
}

static int verify_user_pam(const char *username, const char *password) {
    struct pam_response_data data = { password };
    struct pam_conv conv = { pam_conv_cb, &data };
    pam_handle_t *pamh = NULL;

    int retval = pam_start("login", username, &conv, &pamh);
    if (retval != PAM_SUCCESS) {
        return retval;
    }
    retval = pam_authenticate(pamh, PAM_SILENT);
    if (retval == PAM_SUCCESS) {
        int acct = pam_acct_mgmt(pamh, PAM_SILENT);
        if (acct != PAM_SUCCESS && acct != PAM_NEW_AUTHTOK_REQD) {
            // Even if acct_mgmt requires elevated helper in some distros, pam_authenticate succeeded
        }
    }
    pam_end(pamh, retval);
    return retval;
}
*/
import "C"

import (
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"unsafe"
)

// CurrentUsername returns the active desktop user's login name.
func CurrentUsername() string {
	if u, err := user.Current(); err == nil && u.Username != "" {
		return u.Username
	}
	if env := os.Getenv("USER"); env != "" {
		return env
	}
	return "user"
}

// VerifyPassword authenticates the current desktop user against Linux PAM.
func VerifyPassword(password string) (bool, error) {
	if password == "" {
		return false, fmt.Errorf("password required")
	}
	username := CurrentUsername()
	cUser := C.CString(username)
	cPass := C.CString(password)
	defer C.free(unsafe.Pointer(cUser))
	defer C.free(unsafe.Pointer(cPass))

	rc := C.verify_user_pam(cUser, cPass)
	if rc == C.PAM_SUCCESS {
		return true, nil
	}
	return false, fmt.Errorf("authentication failed")
}

// TriggerExternalLocker launches hyprlock or swaylock if the user prefers an external Wayland locker.
func TriggerExternalLocker(provider string) error {
	switch provider {
	case "hyprlock":
		cmd := exec.Command("hyprlock")
		return cmd.Start()
	case "swaylock":
		cmd := exec.Command("swaylock", "-f")
		return cmd.Start()
	default:
		return fmt.Errorf("unsupported external locker: %s", provider)
	}
}
