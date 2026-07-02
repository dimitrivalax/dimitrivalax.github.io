$(function () {

    function showSuccess(firstName) {
        $('#success').html("<div class='alert alert-success'>");
        $('#success > .alert-success').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
            .append("</button>");
        $('#success > .alert-success')
            .append("<strong>Votre message a bien été envoyé. Merci " + firstName + " !</strong>");
        $('#success > .alert-success').append('</div>');
        $('#contactForm').trigger("reset");
    }

    function showError(firstName) {
        $('#success').html("<div class='alert alert-danger'>");
        $('#success > .alert-danger').html("<button type='button' class='close' data-dismiss='alert' aria-hidden='true'>&times;")
            .append("</button>");
        $('#success > .alert-danger')
            .append("<strong>Désolé " + firstName + ", l'envoi a échoué. Merci de réessayer plus tard.</strong>");
        $('#success > .alert-danger').append('</div>');
    }

    $("input,textarea").jqBootstrapValidation({
        preventSubmit: true,
        submitError: function ($form, event, errors) {
            // additional error messages or events
        },
        submitSuccess: function ($form, event) {
            event.preventDefault();

            var name = $("input#name").val();
            var email = $("input#email").val();
            var phone = $("input#phone").val();
            var message = $("textarea#message").val();
            var website = $("input#website").val();
            var firstName = name;

            if (firstName.indexOf(' ') >= 0) {
                firstName = name.split(' ').slice(0, -1).join(' ');
            }

            var url = window.CONTACT_FORM_URL;
            var anonKey = window.SUPABASE_ANON_KEY;

            if (!url || !anonKey) {
                showError(firstName);
                console.error("Contact form is not configured. Set contact_form_url and supabase_anon_key in _config.yml.");
                return;
            }

            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("Authorization", "Bearer " + anonKey);
            xhr.setRequestHeader("apikey", anonKey);
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) {
                    return;
                }

                if (xhr.status === 200) {
                    showSuccess(firstName);
                    return;
                }

                if (xhr.status === 400 || xhr.status === 401 || xhr.status === 403 || xhr.status === 500) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response && response.error) {
                            console.error("Contact form error:", response.error);
                        }
                    } catch (e) {
                        // ignore parse errors
                    }
                    showError(firstName);
                }
            };

            xhr.send(JSON.stringify({
                name: name,
                phone: phone,
                email: email,
                message: message,
                website: website
            }));
        },
        filter: function () {
            return $(this).is(":visible");
        },
    });

    $("a[data-toggle=\"tab\"]").click(function (e) {
        e.preventDefault();
        $(this).tab("show");
    });
});


/*When clicking on Full hide fail/success boxes */
$('#name').focus(function () {
    $('#success').html('');
});
